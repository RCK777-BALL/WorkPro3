import { Request, Response, NextFunction } from 'express';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import User from '../models/User';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '../validators/authValidators';
import { assertEmail } from '../utils/assert';
// import { isCookieSecure } from '../utils/isCookieSecure'; // <- not used; remove or use if needed

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const FAKE_PASSWORD_HASH =
  '$2b$10$lbmUy86xKlj1/lR8TPPby.1/KfNmrRrgOgGs3u21jcd2SzCBRqDB.';

function getJwtSecretOrThrow(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function createJwt(
  payload: { id: string; email: string; tenantId?: string | undefined; tokenVersion?: number | undefined },
  secret: string,
): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// ------------------------------------------------------------------
// Controllers
// ------------------------------------------------------------------

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Validate input with Zod; removes the need for manual "if (!email || !password)"
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  const { email, password } = parsed.data as LoginInput;
  logger.info('Login attempt', { email });

  try {
    // Select passwordHash if it's select:false in the schema
    const user = await User.findOne({ email }).select(
      '+passwordHash name email role tenantId mfaEnabled tokenVersion',
    );

    logger.info('User lookup result', { found: !!user });
    if (!user) {
      // Mitigate timing attacks
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let valid: boolean;
    try {
      valid = await bcrypt.compare(password, (user as any).passwordHash);
    } catch (err) {
      logger.error('Password comparison error', err);
      return res.status(500).json({ message: 'Server error' });
    }

    logger.info('Password comparison result', { valid });
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If MFA is enabled, require second factor before issuing JWT
    if (user.mfaEnabled) {
      return res.status(200).json({ mfaRequired: true, userId: user._id.toString() });
    }

    // If you do NOT want to auto-enable MFA on first login, remove this block.
    // Leaving it off by default is common; keeping per your original code path commented out.
    // user.mfaEnabled = true;
    // await user.save();

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const payload = {
      id: user._id.toString(),
      email: user.email,
      tenantId,
      tokenVersion: user.tokenVersion,
    };

    let token: string;
    try {
      token = createJwt(payload, getJwtSecretOrThrow());
    } catch (err) {
      logger.error('JWT secret error', err);
      return res.status(500).json({ message: 'Server configuration issue' });
    }

    const { passwordHash: _pw, ...safeUser } = user.toObject();
    return res.status(200).json({ token, user: { ...safeUser, tenantId } });
  } catch (err) {
    logger.error('Login error', err);
    return next(err);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Validate input
  const parsed = await registerSchema.safeParseAsync(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { name, email, password, tenantId, employeeId } = parsed.data as RegisterInput;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password into passwordHash if your model expects that
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      passwordHash,
      tenantId,
      employeeId,
    });

    await user.save();

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    logger.error('Register error', err);
    return next(err);
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email required' });
  }
  assertEmail(email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Respond with success even if user not found to avoid enumeration
      return res.status(200).json({ message: 'Password reset email sent' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: send email with token
    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    logger.error('Password reset request error', err);
    return next(err);
  }
};

export const setupMfa = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { userId } = req.body as { userId?: string };
  const authUserId = req.user?.id as string | undefined;
  const tenantId = req.tenantId as string | undefined;

  if (!authUserId || !tenantId || userId !== authUserId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const secret = speakeasy.generateSecret();
    user.mfaSecret = secret.base32;
    await user.save();

    const token = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32' });
    return res.status(200).json({ secret: user.mfaSecret, token });
  } catch (err) {
    logger.error('setupMfa error', err);
    return next(err);
  }
};

export const validateMfaToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { userId, token } = req.body as { userId?: string; token?: string };
  const authUserId = req.user?.id as string | undefined;
  const tenantId = req.tenantId as string | undefined;

  if (!authUserId || !tenantId || userId !== authUserId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token ?? '',
    });

    if (!valid) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.mfaEnabled = true;
    await user.save();

    const tenantStr = user.tenantId ? user.tenantId.toString() : undefined;
    const payload = {
      id: user._id.toString(),
      email: user.email,
      tenantId: tenantStr,
      tokenVersion: user.tokenVersion,
    };

    let jwtToken: string;
    try {
      jwtToken = createJwt(payload, getJwtSecretOrThrow());
    } catch (err) {
      logger.error('JWT secret error', err);
      return res.status(500).json({ message: 'Server configuration issue' });
    }

    const { passwordHash: _pw, ...safeUser } = user.toObject();
    return res.status(200).json({ token: jwtToken, user: { ...safeUser, tenantId: tenantStr } });
  } catch (err) {
    logger.error('validateMfaToken error', err);
    return next(err);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    return res.status(200).json(user);
  } catch (err) {
    logger.error(err);
    return next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.id as string | undefined;
  if (userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
    } catch (err) {
      logger.error('logout tokenVersion increment error', err);
    }
  }

  return res
    .clearCookie('token', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .status(200)
    .json({ message: 'Logged out' });
};
