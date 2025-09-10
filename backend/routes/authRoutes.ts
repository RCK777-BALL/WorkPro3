import { Router, Request, Response } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
 import { generateMfa, verifyMfa, getMe, logout } from '../controllers/authController';
 
import { configureOIDC } from '../auth/oidc';
import { configureOAuth } from '../auth/oauth';
import { OAuthProvider, getOAuthScope } from '../config/oauthScopes';
import { getJwtSecret } from '../utils/getJwtSecret';
import User from '../models/User';
 import { requireAuth } from '../middleware/authMiddleware';
 
import {
  loginSchema,
  registerSchema,
} from '../validators/authValidators';
 
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
 router.post('/login', async (
  req: Request,
  res: Response,
): Promise<Response> => {
 
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Perform fake compare to mitigate timing attacks
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

     assertEmail(user.email);

     const valid = await bcrypt.compare(password, user.passwordHash);
 
    if (!valid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // If MFA is enabled, require a second factor before issuing a JWT
    if (user.mfaEnabled) {
      // When MFA is enabled, avoid exposing internal identifiers. Inform the
      // client that an MFA code is required. The client should subsequently
      // call POST /auth/mfa/verify with the original email and the MFA token
      // to receive the JWT.
      return res.status(200).json({ mfaRequired: true });
    }

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const secret = getJwtSecret(res);
     if (!secret) {
      return res;
    }
     const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        tenantId,
        tokenVersion: user.tokenVersion,
      },
      secret,
      { expiresIn: '7d' },
    );
 
    const { password: _pw, ...safeUser } = user.toObject();

    const responseBody: Record<string, unknown> = {
      user: { ...safeUser, tenantId },
    };

    if (process.env.INCLUDE_AUTH_TOKEN === 'true') {
      responseBody.token = token;
    }

 
    return res
      .cookie('token', token, {
         httpOnly: true,
        sameSite: 'lax',
        secure: isCookieSecure(),
 
      })
      .status(200)
       .json({ token, user: { ...safeUser, tenantId } });
  } catch (err) {
    console.error('Login error:', err);
 
    return res.status(500).json({ message: 'Server error' });
  }
});

// Local register (optional)
 router.post('/register', async (req, res) => {
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
    await user.save().catch((err: any) => {
      if (err.code === 11000) {
        res.status(400).json({ message: 'Email or employee ID already in use' });
        return;
      }
      throw err;
    });
    if (res.headersSent) {
      return;
    }
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Server error' });
    }
 
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
      if (res.headersSent) {
        resolve();
      }
    });
  } catch (err) {
    next(err);
  }
 
});

router.get('/oauth/:provider/callback', async (req, res, next) => {
  const provider = req.params.provider as OAuthProvider;
   try {
    const user = await new Promise<Express.User>((resolve, reject) => {
      passport.authenticate(
        provider,
        { session: false },
        (err: Error | null, user: Express.User | false | null) => {
          if (err || !user) {
            return reject(err || new Error('Authentication failed'));
          }
          resolve(user);
        },
      )(req, res, (err) => (err ? reject(err) : undefined));
    });

    const secret = getJwtSecret(res);
    if (!secret) {
      return;
    }
    assertEmail(user.email);
    const token = jwt.sign({ email: user.email }, secret as string, {
      expiresIn: '7d',
    });
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
    const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(
      user.email,
    )}`;
    return res.redirect(redirectUrl);
  } catch {
    return res.status(400).json({ message: 'Authentication failed' });
  }
 
});

// MFA endpoints
 router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', validateMfaToken);
 

// Authenticated routes
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
