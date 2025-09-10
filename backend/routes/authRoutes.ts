import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { generateMfa, verifyMfa } from '../controllers/authController';
import { configureOIDC } from '../auth/oidc';
import { configureOAuth, getOAuthScope, OAuthProvider } from '../auth/oauth';
import { getJwtSecret } from '../utils/getJwtSecret';
import User from '../models/User';
import {
  loginSchema,
  registerSchema,
} from '../validators/authValidators';
 
interface OAuthUser extends Express.User {
  email: string;
}
 
 

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
router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

     const valid = await bcrypt.compare(password, user.password);
 
 
    if (!valid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.mfaEnabled) {
      // When MFA is enabled, avoid exposing internal identifiers. Inform the
      // client that an MFA code is required. The client should subsequently
      // call POST /auth/mfa/verify with the original email and the MFA token
      // to receive the JWT.
      return res.status(200).json({ mfaRequired: true });
    }

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const secret = getJwtSecret(res);
    if (secret === undefined) {
      return;
    }
     const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        tenantId,
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
        secure: process.env.NODE_ENV === 'production',
      })
      .status(200)
       .json({ token, user: { ...safeUser, tenantId } });
  } catch (err) {
    console.error('Login error:', err);
 
    return res.status(500).json({ message: 'Server error' });
  }
});

// Local register (optional)
router.post('/register', registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { name, email, password, tenantId, employeeId } = parsed.data;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const user = new User({ name, email, passwordHash: password, tenantId, employeeId });
    await user.save();
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
     console.error('Register error:', err);
 
    return res.status(500).json({ message: 'Server error' });
  }
});

// OAuth routes
router.get('/oauth/:provider', (req, res, next) => {
  const provider = req.params.provider as OAuthProvider;
  passport.authenticate(provider, { scope: getOAuthScope(provider) })(
    req,
    res,
    next,
  );
});

router.get('/oauth/:provider/callback', (req, res, next) => {
  const provider = req.params.provider as OAuthProvider;
  passport.authenticate(
    provider,
    { session: false },
    (err: Error | null, user: Express.User | false | null) => {
      if (err || !user) {
        return res.status(400).json({ message: 'Authentication failed' });
      }
      const { email } = user as OAuthUser;
      const secret = getJwtSecret(res);
      if (secret === undefined) {
        return;
      }
       assertEmail(user.email);
      const token = jwt.sign({ email: user.email }, secret, {
 
        expiresIn: '7d',
      });
      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
      const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(
        email,
      )}`;
      return res.redirect(redirectUrl);
    },
  )(req, res, next);
});

// MFA endpoints
router.post('/mfa/setup', generateMfa);
// After a login request that returns { mfaRequired: true }, the client should
// submit the email and MFA code to this endpoint to obtain the JWT.
router.post('/mfa/verify', verifyMfa);

export default router;
