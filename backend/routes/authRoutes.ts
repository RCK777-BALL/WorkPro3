import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { login, generateMfa, verifyMfa } from '../controllers/authController';
import { configureOIDC } from '../auth/oidc';
import { configureOAuth, getOAuthScope, OAuthProvider } from '../auth/oauth';

configureOIDC();
configureOAuth();

const router = Router();
router.use(passport.initialize());

// Local login
router.post('/login', login);

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
    (err, user) => {
      if (err || !user) {
        return res.status(400).json({ message: 'Authentication failed' });
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ message: 'Server configuration issue' });
      }
      const token = jwt.sign({ email: user.email }, secret, {
        expiresIn: '7d',
      });
      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173/login';
      const redirectUrl = `${frontend}?token=${token}&email=${encodeURIComponent(
        user.email,
      )}`;
      return res.redirect(redirectUrl);
    },
  )(req, res, next);
});

// MFA endpoints
router.post('/mfa/setup', generateMfa);
router.post('/mfa/verify', verifyMfa);

export default router;
