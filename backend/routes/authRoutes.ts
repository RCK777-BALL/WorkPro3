import { Router, Request, Response } from 'express';
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


const FAKE_PASSWORD_HASH =
  '$2b$10$lbmUy86xKlj1/lR8TPPby.1/KfNmrRrgOgGs3u21jcd2SzCBRqDB.';

configureOIDC();
configureOAuth();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
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
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<Response> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { email, password } = parsed.data;

  try {
    // make sure password is selectable in your schema (select: false -> use +password)
    const user = await User.findOne({ email }).select('+password +mfaEnabled +tenantId +tokenVersion +email +name');
    if (!user) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH); // mitigate timing
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const hashed = (user as any).password as string | undefined;
    if (!hashed) {
      // If password is still missing due to schema, treat as invalid
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, hashed);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if ((user as any).mfaEnabled) {
      return res.status(200).json({ mfaRequired: true });
    }

    const tenantId = (user as any).tenantId ? (user as any).tenantId.toString() : undefined;

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      return res.status(500).json({ message: 'Server configuration issue' });
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

    const userObj = user.toObject();
    delete (userObj as any).password;

    const responseBody: Record<string, unknown> = {
      user: { ...userObj, tenantId },
    };
    if (process.env.INCLUDE_AUTH_TOKEN === 'true') {
      responseBody.token = token;
    }

    return res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      .status(200)
      .json({ token, user: { ...userObj, tenantId } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Local register (optional)
router.post('/register', registerLimiter, async (req: Request, res: Response): Promise<Response> => {
  const parsed = await registerSchema.safeParseAsync(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const { name, email, password, tenantId, employeeId } = parsed.data;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = new User({ name, email, password, tenantId, employeeId });
    try {
      await user.save();
    } catch (err: any) {
      if (err && err.code === 11000) {
        return res.status(400).json({ message: 'Email or employee ID already in use' });
      }
      throw err;
    }

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// OAuth routes
router.get('/oauth/:provider', async (req, res, next) => {
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

router.get('/oauth/:provider/callback', async (req, res, next) => {
  const provider = req.params.provider as OAuthProvider;
  passport.authenticate(
    provider,
    { session: false },
    (err: Error | null, user: Express.User | false | null) => {
      if (err || !user) {
        if (err) {
          console.error(`OAuth ${provider} callback error:`, err);
        }
        return res.status(400).json({ message: 'Authentication failed' });
      }
      let secret: string;
      try {
        secret = getJwtSecret();
      } catch {
        return res.status(500).json({ message: 'Server configuration issue' });
      }
      assertEmail((user as any).email);
      const token = jwt.sign({ email: (user as any).email }, secret, {
        expiresIn: '7d',
      });
      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
      const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(
        (user as any).email,
      )}`;
      return res.redirect(redirectUrl);
    },
  )(req, res, next);
});

// MFA endpoints
router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', validateMfaToken);

// Authenticated routes
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
