import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

const router = Router();
router.use(passport.initialize());

// Local login
router.post('/login', async (req, res) => {
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
      return res
        .status(200)
        .json({ mfaRequired: true, userId: user._id.toString() });
    }

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const secret = getJwtSecret(res);
    if (!secret) {
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
      .json(responseBody);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Local register (optional)
router.post('/register', async (req, res) => {
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
  } catch {
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
      if (!secret) {
        return;
      }
      const token = jwt.sign({ email }, secret as string, {
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
router.post('/mfa/verify', verifyMfa);

export default router;
