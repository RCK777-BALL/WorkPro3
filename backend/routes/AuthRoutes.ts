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
import { configureOAuth } from '../auth/oauth';
import { configureOIDC, type Provider as OIDCProvider } from '../auth/oidc';

configureOAuth();
configureOIDC();

const ROLE_PRIORITY = [
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
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

const toStringId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString(): string }).toString();
  }
  return undefined;
};

const sanitizeRedirect = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const trimmed = decoded.trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return undefined;
  }
  if (!trimmed.startsWith('/')) {
    return undefined;
  }
  return trimmed;
};

const getRequestedState = (req: Request): string | undefined => {
  if (typeof req.query.state === 'string') {
    return req.query.state;
  }
  if (typeof req.query.redirect === 'string') {
    return req.query.redirect;
  }
  return undefined;
};

const buildRedirectUrl = (
  token: string,
  meta: {
    email: string;
    tenantId?: string | undefined;
    siteId?: string | undefined;
    roles?: string[] | undefined;
    userId?: string | undefined;
    redirect?: string | undefined;
  },
): string => {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173/login';
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL('http://localhost:5173/login');
  }

  url.searchParams.set('token', token);
  url.searchParams.set('email', meta.email);
  if (meta.tenantId) {
    url.searchParams.set('tenantId', meta.tenantId);
  }
  if (meta.siteId) {
    url.searchParams.set('siteId', meta.siteId);
  }
  if (meta.roles && meta.roles.length > 0) {
    url.searchParams.set('roles', meta.roles.join(','));
  }
  if (meta.userId) {
    url.searchParams.set('userId', meta.userId);
  }
  if (meta.redirect) {
    url.searchParams.set('redirect', meta.redirect);
  }
  return url.toString();
};

const extractPassportRoles = (user: unknown): string[] => {
  if (!user || typeof user !== 'object') {
    return [];
  }
  const payload = user as { roles?: unknown; role?: unknown };
  return normalizeRoles(payload.roles ?? payload.role);
};

const extractPassportId = (user: unknown): string | undefined => {
  if (!user || typeof user !== 'object') {
    return undefined;
  }
  const payload = user as { id?: unknown; _id?: unknown };
  return toStringId(payload.id) ?? toStringId(payload._id);
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

const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'github'];
const OIDC_PROVIDERS: readonly OIDCProvider[] = ['okta', 'azure'];

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
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  try {
    const user = await User.findById(parsed.data.userId).select('+mfaSecret +mfaEnabled');
    if (!user) {
      sendResponse(res, null, 'User not found', 404);
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false;
    await user.save();

    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    sendResponse(
      res,
      { secret: secret.base32, token },
      null,
      200,
      'MFA secret generated',
    );
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
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  const { userId, token, remember = false } = parsed.data;

  try {
    const user = await User.findById(userId).select(
      '+mfaSecret +mfaEnabled +tenantId +tokenVersion +email +name +roles +role +siteId',
    );
    if (!user || !user.mfaSecret) {
      sendResponse(res, null, 'MFA not configured', 400);
      return;
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      sendResponse(res, null, 'Invalid MFA token', 400);
      return;
    }

    user.mfaEnabled = true;
    await user.save();

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, 'Server configuration issue', 500);
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
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  const { name, email, password, tenantId, employeeId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      sendResponse(res, null, 'Email already in use', 400);
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

    sendResponse(
      res,
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        tenantId: user.tenantId?.toString(),
        employeeId: user.employeeId,
      },
      null,
      201,
      'User registered successfully',
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      sendResponse(res, null, 'Email or employee ID already in use', 400);
      return;
    }

    logger.error('Register error:', err);
    next(err);
  }
});

router.get('/oauth/:provider', async (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    sendResponse(res, null, 'Unsupported provider', 400);
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const auth = passport.authenticate(provider, {
        scope: getOAuthScope(provider),
        state: getRequestedState(req),
      });
      auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/oidc/:provider', async (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider as OIDCProvider;
  if (!OIDC_PROVIDERS.includes(provider)) {
    sendResponse(res, null, 'Unsupported provider', 400);
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const auth = passport.authenticate(provider, {
        scope: ['openid', 'profile', 'email'],
        state: getRequestedState(req),
      });
      auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    next(err);
  }
});

const handlePassportCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
  provider: string,
) => {
  passport.authenticate(
    provider,
    { session: false },
    (err: Error | null, user: unknown) => {
      if (err || !user) {
        if (err) {
          logger.error(`OAuth ${provider} callback error:`, err);
        }
        sendResponse(res, null, 'Authentication failed', 400);
        return;
      }

      let secret: string;
      try {
        secret = getJwtSecret();
      } catch {
        sendResponse(res, null, 'Server configuration issue', 500);
        return;
      }

      const email = (user as { email?: unknown }).email;
      assertEmail(email);

      const tenantId = toStringId((user as { tenantId?: unknown }).tenantId);
      const siteId = toStringId((user as { siteId?: unknown }).siteId);
      const userId = extractPassportId(user);
      const roles = extractPassportRoles(user);

      const tokenPayload: Record<string, unknown> = { email };
      if (tenantId) {
        tokenPayload.tenantId = tenantId;
      }
      if (siteId) {
        tokenPayload.siteId = siteId;
      }
      if (userId) {
        tokenPayload.id = userId;
      }
      if (roles.length > 0) {
        tokenPayload.roles = roles;
      }

      const token = jwt.sign(tokenPayload, secret, {
        expiresIn: TOKEN_TTL,
      });

      const stateValue =
        typeof req.query.state === 'string'
          ? req.query.state
          : typeof req.query.redirect === 'string'
            ? req.query.redirect
            : undefined;
      const redirectHint = sanitizeRedirect(stateValue);

      const redirectUrl = buildRedirectUrl(token, {
        email,
        tenantId,
        siteId,
        roles,
        userId,
        redirect: redirectHint,
      });
      res.redirect(redirectUrl);
    },
  )(req, res, next);
};

router.get(
  '/oauth/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider as OAuthProvider;
    if (!OAUTH_PROVIDERS.includes(provider)) {
      sendResponse(res, null, 'Unsupported provider', 400);
      return;
    }

    try {
      handlePassportCallback(req, res, next, provider);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/oidc/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider as OIDCProvider;
    if (!OIDC_PROVIDERS.includes(provider)) {
      sendResponse(res, null, 'Unsupported provider', 400);
      return;
    }

    try {
      handlePassportCallback(req, res, next, provider);
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
