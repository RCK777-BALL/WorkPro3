/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { register, login, me, refresh, logout } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimiters';

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
    res.status(400).json({ message: 'Invalid request.' });
    return;
  }
  const { email, password, remember = false } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // make sure the hashed password is selectable in your schema (select: false -> use +passwordHash)
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash +mfaEnabled +tenantId +tokenVersion +email +name',
    );
    if (!user) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH); // mitigate timing
      res.status(400).json({ message: 'Invalid email or password.' });
      return;
    }

    const hashed = (user as any).passwordHash as string | undefined;
    if (!hashed) {
      // If password is still missing due to schema, treat as invalid
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      res.status(400).json({ message: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(password, hashed);
    if (!valid) {
      res.status(400).json({ message: 'Invalid email or password.' });
      return;
    }

    const tenantId = (user as any).tenantId ? (user as any).tenantId.toString() : undefined;

    if ((user as any).mfaEnabled) {
      res.json({
        mfaRequired: true,
        userId: user._id.toString(),
      });
      return;
    }

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      res.status(500).json({ message: 'Server configuration issue' });
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

    const normalizedRoles = normalizeRoles((userObj as { roles?: unknown }).roles);
    const primaryRole = derivePrimaryRole((userObj as { role?: unknown }).role, normalizedRoles);
    const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));
    const userId = user._id.toString();

    const responseData: {
      user: typeof userObj & { tenantId?: string; role: string; roles: string[]; id: string; _id: string };
      token?: string;
    } = {
      user: {
        ...userObj,
        id: userId,
        _id: userId,
        tenantId,
        role: primaryRole,
        roles,
      },
    };
    if (process.env.INCLUDE_AUTH_TOKEN === 'true') {
      responseData.token = token;
    }

    const maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8;
    res.cookie('auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isCookieSecure(),
      maxAge,
    });
    res.json(responseData);
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

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

export default router;
