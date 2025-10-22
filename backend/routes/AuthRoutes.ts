/*
 * SPDX-License-Identifier: MIT
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import { z } from 'zod';

import User, { type UserDocument } from '../models/User';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiters';
import { getJwtSecret } from '../utils/getJwtSecret';
import { isCookieSecure } from '../utils/isCookieSecure';
import logger from '../utils/logger';
import { assertEmail } from '../utils/assert';
import { getOAuthScope, type OAuthProvider } from '../config/oauthScopes';
import { me, refresh, logout } from '../controllers/authController';
import sendResponse from '../utils/sendResponse';

const ROLE_PRIORITY = [
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'team_leader',
  'team_member',
  'area_leader',
  'department_leader',
  'viewer',
];

const normalizeRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  const list = Array.isArray(roles) ? roles : [roles];
  const normalized: string[] = [];
  for (const role of list) {
    if (typeof role !== 'string') continue;
    const candidate = role.toLowerCase();
    if (!normalized.includes(candidate)) {
      normalized.push(candidate);
    }
  }
  return normalized;
};

const derivePrimaryRole = (role: unknown, roles: string[]): string => {
  if (typeof role === 'string') {
    const candidate = role.toLowerCase();
    if (ROLE_PRIORITY.includes(candidate)) {
      return candidate;
    }
  }
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) {
      return candidate;
    }
  }
  return roles[0] ?? 'tech';
};

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerBodySchema = registerSchema.extend({
  name: z.string().min(1, 'Name is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
});

const mfaSetupSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
});

const mfaVerifySchema = mfaSetupSchema.extend({
  token: z.string().min(1, 'MFA token is required'),
  remember: z.boolean().optional(),
});

const FAKE_PASSWORD_HASH = bcrypt.hashSync('invalid-password', 10);

const AUTH_COOKIE_NAME = 'auth';
const TOKEN_TTL = '7d';
const SHORT_SESSION_MS = 1000 * 60 * 60 * 8;
const LONG_SESSION_MS = 1000 * 60 * 60 * 24 * 30;

type AuthUser = {
  tenantId?: string;
  role: string;
  roles: string[];
  id: string;
  _id: string;
} & Record<string, unknown>;

const toAuthUser = (user: UserDocument): AuthUser => {
  const plain = user.toObject<Record<string, unknown>>();
  delete (plain as Record<string, unknown>).password;
  delete (plain as Record<string, unknown>).passwordHash;

  const normalizedRoles = normalizeRoles((plain as { roles?: unknown }).roles);
  const primaryRole = derivePrimaryRole((plain as { role?: unknown }).role, normalizedRoles);
  const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));
  const userId = user._id.toString();

  const tenantValue = (plain as { tenantId?: unknown }).tenantId;
  const tenantId =
    typeof tenantValue === 'string'
      ? tenantValue
      : tenantValue && typeof (tenantValue as { toString?: () => string }).toString === 'function'
      ? (tenantValue as { toString(): string }).toString()
      : undefined;

  return {
    ...plain,
    id: userId,
    _id: userId,
    tenantId,
    role: primaryRole,
    roles,
  } as AuthUser;
};

const sendAuthSuccess = (
  res: Response,
  authUser: AuthUser,
  token: string,
  remember: boolean,
): void => {
  const maxAge = remember ? LONG_SESSION_MS : SHORT_SESSION_MS;

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isCookieSecure(),
    maxAge,
  });

  sendResponse(
    res,
    {
      token,
      user: authUser,
    },
    null,
    200,
    'Login successful',
  );
};

const setupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const parsed = mfaSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  try {
    const user = await User.findById(parsed.data.userId).select('+mfaSecret +mfaEnabled');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false;
    await user.save();

    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    res.json({ secret: secret.base32, token });
  } catch (err) {
    logger.error('MFA setup error:', err);
    next(err);
  }
};

const validateMfaToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const parsed = mfaVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  const { userId, token, remember = false } = parsed.data;

  try {
    const user = await User.findById(userId).select(
      '+mfaSecret +mfaEnabled +tenantId +tokenVersion +email +name +roles +role +siteId',
    );
    if (!user || !user.mfaSecret) {
      res.status(400).json({ message: 'MFA not configured' });
      return;
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      res.status(400).json({ message: 'Invalid MFA token' });
      return;
    }

    user.mfaEnabled = true;
    await user.save();

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      res.status(500).json({ message: 'Server configuration issue' });
      return;
    }

    const authUser = toAuthUser(user);
    const emailForToken =
      typeof authUser.email === 'string' ? authUser.email : user.email ?? '';

    const signed = jwt.sign(
      {
        id: authUser.id,
        email: emailForToken,
        tenantId: authUser.tenantId,
        tokenVersion: user.tokenVersion,
      },
      secret,
      { expiresIn: TOKEN_TTL },
    );

    sendAuthSuccess(res, authUser, signed, remember);
  } catch (err) {
    logger.error('MFA verification error:', err);
    next(err);
  }
};

const router = Router();
router.use(passport.initialize());

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request.', 400);
    return;
  }

  const { email, password, remember = false } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash +mfaEnabled +tenantId +tokenVersion +email +name +roles +role +siteId',
    );

    if (!user) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    const hashed = user.passwordHash;
    if (!hashed) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    const valid = await bcrypt.compare(password, hashed);
    if (!valid) {
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    if (user.mfaEnabled) {
      sendResponse(
        res,
        {
          mfaRequired: true,
          userId: user._id.toString(),
        },
        null,
        200,
        'Multi-factor authentication required',
      );
      return;
    }

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, 'Server configuration issue', 500);
      return;
    }

    const authUser = toAuthUser(user);
    const emailForToken = typeof authUser.email === 'string' ? authUser.email : normalizedEmail;

    const token = jwt.sign(
      {
        id: authUser.id,
        email: emailForToken,
        tenantId: authUser.tenantId,
        tokenVersion: user.tokenVersion,
      },
      secret,
      { expiresIn: TOKEN_TTL },
    );

    sendAuthSuccess(res, authUser, token, remember);
  } catch (err) {
    logger.error('Login error:', err);
    next(err);
  }
});

router.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = await registerBodySchema.safeParseAsync(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  const { name, email, password, tenantId, employeeId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    const user = new User({
      name,
      email: normalizedEmail,
      passwordHash: password,
      tenantId,
      employeeId,
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(400).json({ message: 'Email or employee ID already in use' });
      return;
    }

    logger.error('Register error:', err);
    next(err);
  }
});

router.get('/oauth/:provider', async (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider as OAuthProvider;

  try {
    await new Promise<void>((resolve, reject) => {
      const auth = passport.authenticate(provider, {
        scope: getOAuthScope(provider),
      });
      auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/oauth/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider as OAuthProvider;

    try {
      passport.authenticate(
        provider,
        { session: false },
        (err: Error | null, user: unknown) => {
          if (err || !user) {
            if (err) {
              logger.error(`OAuth ${provider} callback error:`, err);
            }
            res.status(400).json({ message: 'Authentication failed' });
            return;
          }

          let secret: string;
          try {
            secret = getJwtSecret();
          } catch {
            res.status(500).json({ message: 'Server configuration issue' });
            return;
          }

          const email = (user as { email?: unknown }).email;
          assertEmail(email);

          const token = jwt.sign({ email }, secret, {
            expiresIn: TOKEN_TTL,
          });

          const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
          const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(email)}`;
          res.redirect(redirectUrl);
        },
      )(req, res, next);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', validateMfaToken);

router.get('/me', requireAuth, me);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

export default router;
