/*
 * SPDX-License-Identifier: MIT
 */


import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import User, { UserDocument } from '../models/User';

interface TokenPayload {
  id: string;
  tokenVersion?: number;
}

/**
 * Authenticate requests using a JWT token. The token may be provided
 * in the `Authorization` header as a Bearer token or via the
 * `token` cookie. When valid, the corresponding user document is
 * loaded and attached to `req.user`.
 */
 
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
 
  try {
    let token: string | undefined = req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id, tokenVersion } = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as TokenPayload;

    if (!id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
 
 
    const user = await User.findById(id).lean<UserDocument>().exec();

    if (!user || (tokenVersion ?? 0) !== user.tokenVersion) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const tenantId = user.tenantId.toString();
    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      roles: user.roles ?? [],
    };
    req.tenantId = tenantId;

    next();
  } catch (_err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default {
  requireAuth,
};
