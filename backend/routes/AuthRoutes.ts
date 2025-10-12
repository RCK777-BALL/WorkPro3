/*
 * SPDX-License-Identifier: MIT
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import { getMe, logout, setupMfa, validateMfaToken } from '../controllers/authController';
import { configureOIDC } from '../auth/oidc';
import { configureOAuth } from '../auth/oauth';
import { OAuthProvider, getOAuthScope } from '../config/oauthScopes';
import { getJwtSecret } from '../utils/getJwtSecret';
import User from '../models/User';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { assertEmail } from '../utils/assert';
// Adjust this import path if your middleware lives elsewhere:
import { requireAuth } from '../middleware/requireAuth';
import logger from '../utils/logger';
import { isCookieSecure } from '../utils/isCookieSecure';
import { sendResponse } from '../utils/sendResponse';


const FAKE_PASSWORD_HASH =
  '$2b$10$lbmUy86xKlj1/lR8TPPby.1/KfNmrRrgOgGs3u21jcd2SzCBRqDB.';

configureOIDC();
configureOAuth();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Count only failed login attempts so background jobs or legitimate
  // repeated sign-ins don't immediately hit the limiter.
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});

const router = Router();
router.use(passport.initialize());

// Local login
router.post('/login', loginLimiter, async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, { message: 'Invalid request' }, 400);
    return;
  }
  const { email, password } = parsed.data;

  try {
    // make sure the hashed password is selectable in your schema (select: false -> use +passwordHash)
    const user = await User.findOne({ email }).select(
      '+passwordHash +mfaEnabled +tenantId +tokenVersion +email +name',
    );
    if (!user) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH); // mitigate timing
      sendResponse(res, null, { message: 'Invalid email or password' }, 400);
      return;
    }

    const hashed = (user as any).passwordHash as string | undefined;
    if (!hashed) {
      // If password is still missing due to schema, treat as invalid
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      sendResponse(res, null, { message: 'Invalid email or password' }, 400);
      return;
    }

    const valid = await bcrypt.compare(password, hashed);
    if (!valid) {
      sendResponse(res, null, { message: 'Invalid email or password' }, 400);
      return;
    }

    const tenantId = (user as any).tenantId ? (user as any).tenantId.toString() : undefined;

    if ((user as any).mfaEnabled) {
      sendResponse(res, {
        mfaRequired: true,
        userId: user._id.toString(),
      });

      return;
    }

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, { message: 'Server configuration issue' }, 500);
      return;
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: (user as any).email,
        tenantId,
        tokenVersion: (user as any).tokenVersion,
      },
      secret,
      { expiresIn: '7d' },
    );

    const userObj = user.toObject<Record<string, unknown>>();
    delete userObj.password;
    delete userObj.passwordHash;

    const responseData: {
      user: typeof userObj & { tenantId?: string };
      token?: string;
    } = {
      user: { ...userObj, tenantId },
    };
    if (process.env.INCLUDE_AUTH_TOKEN === 'true') {
      responseData.token = token;
    }

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isCookieSecure(),
    });
    sendResponse(res, responseData);
    return;
  } catch (err) {
    logger.error('Login error:', err);
    next(err);
    return;
  }
});

// Local register (optional)
router.post(
  '/register',
  registerLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = await registerSchema.safeParseAsync(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    const { name, email, password, tenantId, employeeId } = parsed.data;

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }

      const user = new User({
        name,
        email,
        passwordHash: password,
        tenantId,
        employeeId,
      });
      try {
        await user.save();
      } catch (err: any) {
        if (err && err.code === 11000) {
          res.status(400).json({ message: 'Email or employee ID already in use' });
          return;
        }
        throw err;
      }
      res.status(201).json({ message: 'User registered successfully' });
      return;
    } catch (err) {
      logger.error('Register error:', err);
      next(err);
      return;
    }
  },
);

// OAuth routes
router.get(
  '/oauth/:provider',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider as OAuthProvider;
    try {
      await new Promise<void>((resolve, reject) => {
        const auth = passport.authenticate(provider, {
          scope: getOAuthScope(provider),
        });
        auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  },
);

router.get(
  '/oauth/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = req.params.provider as OAuthProvider;
      passport.authenticate(
        provider,
        { session: false },
        (err: Error | null, user: Express.User | false | null) => {
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
          assertEmail((user as any).email);
          const token = jwt.sign({ email: (user as any).email }, secret, {
            expiresIn: '7d',
          });
          const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
          const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(
            (user as any).email,
          )}`;
          res.redirect(redirectUrl);
          return;
        },
      )(req, res, next);
      return;
    } catch (err) {
      next(err);
      return;
    }
  },
);

// MFA endpoints
router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', validateMfaToken);

// Authenticated routes
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
