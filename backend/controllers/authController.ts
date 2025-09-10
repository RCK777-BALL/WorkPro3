import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as speakeasy from "speakeasy";
import logger from "../utils/logger";
import User from "../models/User";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '../validators/authValidators';
import { assertEmail } from '../utils/assert';
 import { isCookieSecure } from '../utils/isCookieSecure';
 

const FAKE_PASSWORD_HASH =
  '$2b$10$lbmUy86xKlj1/lR8TPPby.1/KfNmrRrgOgGs3u21jcd2SzCBRqDB.';

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
  logger.info('Login attempt', { email });

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  
  }
  const { email, password } = data;
  logger.info('Login attempt', { email });

  try {
    const user = await User.findOne({ email });
    logger.info('User lookup result', { found: !!user });
    if (!user) {
       // Perform fake compare to mitigate timing attacks
      await bcrypt.compare(req.body.password, FAKE_PASSWORD_HASH);
      res.status(401).json({ message: 'Invalid email or password' });
      return;
 
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    logger.info('Password comparison result', { valid });
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.mfaEnabled) {
      return res
        .status(200)
        .json({ mfaRequired: true, userId: user._id.toString() });
    }

    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      await user.save();
    }
    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is not configured');
      return res
        .status(500)
        .json({ message: 'Server configuration issue' });
    }
    const token = createJwt(user, secret);

    const { passwordHash: _pw, ...safeUser } = user.toObject();
    return res.status(200).json({ token, user: { ...safeUser, tenantId } });
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, tenantId, employeeId } = req.body;

  if (!name || !email || !password || !tenantId || !employeeId) {
    return res.status(400).json({ message: "Missing required fields" });
  
  }
  const { name, email, password, tenantId, employeeId } = data;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

     const user = new User({
      name,
      email,
      passwordHash: password,
      tenantId,
      employeeId,
    });
    await user.save();
 

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
     logger.error("Register error", err);
    return res.status(500).json({ message: "Server error" });
 
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }
  assertEmail(email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Respond with success even if user not found to avoid user enumeration
      return res.status(200).json({ message: "Password reset email sent" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In a real application, you would send the reset token via email here
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    logger.error("Password reset request error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

 export const setupMfa = async (req: Request, res: Response): Promise<void> => {
 
  const { userId } = req.body;
  const authUserId = req.user?.id;
  const tenantId = req.tenantId;

  if (!authUserId || !tenantId || userId !== authUserId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
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
    return res
      .status(200)
      .json({ secret: user.mfaSecret, token });
  } catch (err) {
     logger.error('setupMfa error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateMfaToken = async (req: Request, res: Response): Promise<void> => {
 
  const { userId, token } = req.body;
  const authUserId = req.user?.id;
  const tenantId = req.tenantId;

  if (!authUserId || !tenantId || userId !== authUserId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const user = await User.findOne({ _id: userId, tenantId });
 
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ message: 'Invalid user' });
    }
    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });
    if (!valid) {
      return res.status(400).json({ message: 'Invalid token' });
    }
     user.mfaEnabled = true;
    await user.save();
     const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
 
    const secret = process.env.JWT_SECRET;
 
    if (!secret) {
       return res
        .status(500)
        .json({ message: 'Server configuration issue' });
 
    }
    const jwtToken = createJwt(user, secret);
    const { passwordHash: _pw, ...safeUser } = user.toObject();
     return res
      .status(200)
      .json({ token: jwtToken, user: { ...safeUser, tenantId } });
 
  } catch (err) {
     logger.error('validateMfaToken error', err);
    res.status(500).json({ message: 'Server error' });
 
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Example user retrieval from req.user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    return res.status(200).json(user);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const logout = (
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  return res
    .clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isCookieSecure(),
    })
    .status(200)
    .json({ message: 'Logged out' });
};
