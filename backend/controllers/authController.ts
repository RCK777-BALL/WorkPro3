import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import * as speakeasy from "speakeasy";
import logger from "../utils/logger";
import User from "../models/User";
import { assertEmail } from '../utils/assert';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  logger.info('Login attempt', { email });

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password required' });
    return;
  }
  assertEmail(email);

  try {
    const user = await User.findOne({ email });
    logger.info('User lookup result', { found: !!user });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    logger.info('Password comparison result', { valid });
    if (!valid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (user.mfaEnabled) {
      res.status(200).json({ mfaRequired: true, userId: user._id.toString() });
      return;
    }

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const payload = {
      id: user._id.toString(),
      email: user.email,
      tenantId,
    };
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is not configured');
      res.status(500).json({ message: 'Server configuration issue' });
      return;
    }
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    const { passwordHash: _pw, ...safeUser } = user.toObject();
    res.status(200).json({ token, user: { ...safeUser, tenantId } });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, tenantId, employeeId } = req.body;

  if (!name || !email || !password || !tenantId || !employeeId) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }
  assertEmail(email);

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }

    const user = new User({ name, email, passwordHash: password, tenantId, employeeId });
    await user.save().catch((err: any) => {
      if (err.code === 11000) {
        res.status(400).json({ message: "Email or employee ID already in use" });
        return;
      }
      throw err;
    });

    if (res.headersSent) {
      return;
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (!res.headersSent) {
      logger.error("Register error", err);
      res.status(500).json({ message: "Server error" });
    }
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email required" });
    return;
  }
  assertEmail(email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Respond with success even if user not found to avoid user enumeration
      res.status(200).json({ message: "Password reset email sent" });
      return;
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In a real application, you would send the reset token via email here
    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    logger.error("Password reset request error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateMfa = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const secret = speakeasy.generateSecret();
    user.mfaSecret = secret.base32;
    await user.save();
    const token = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32' });
    res.json({ secret: user.mfaSecret, token });
  } catch (err) {
    logger.error('generateMfa error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyMfa = async (req: Request, res: Response): Promise<void> => {
  const { userId, token } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user || !user.mfaSecret) {
      res.status(400).json({ message: 'Invalid user' });
      return;
    }
    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });
    if (!valid) {
      res.status(400).json({ message: 'Invalid token' });
      return;
    }
    user.mfaEnabled = true;
    await user.save();
    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const payload = { id: user._id.toString(), email: user.email, tenantId };
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: 'Server configuration issue' });
      return;
    }
    const jwtToken = jwt.sign(payload, secret, { expiresIn: '7d' });
    const { passwordHash: _pw, ...safeUser } = user.toObject();
    res.json({ token: jwtToken, user: { ...safeUser, tenantId } });
  } catch (err) {
    logger.error('verifyMfa error', err);
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

    res.json(user);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const logout = (
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    .sendStatus(200);
};
