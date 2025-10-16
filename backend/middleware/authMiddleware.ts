/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler, Request, Response, NextFunction } from 'express';
import type { HydratedDocument } from 'mongoose';
import jwt from 'jsonwebtoken';

import User from '../models/User';
import type { UserDocument, UserRole } from '../models/User';
import type { AuthedRequest } from '../types/http';

type DecodedToken = {
  id?: string;
  tenantId?: string;
  role?: string;
  siteId?: string;
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const toPlainUser = (user: HydratedDocument<UserDocument>, decoded: DecodedToken): Express.User => {
  const plain = user.toObject({ getters: true, virtuals: false });
  delete (plain as { passwordHash?: unknown }).passwordHash;

  const tenantId = decoded.tenantId ?? (plain.tenantId ? String(plain.tenantId) : undefined);
  const siteId = decoded.siteId ?? ((plain as { siteId?: unknown }).siteId ? String((plain as { siteId?: unknown }).siteId) : undefined);
  const roleFromDoc = (plain as { role?: unknown }).role;
  const rolesFromDoc = Array.isArray((plain as { roles?: unknown }).roles)
    ? ((plain as { roles?: unknown }).roles as unknown[]).map((value) => String(value))
    : [];
  const role = decoded.role ?? (typeof roleFromDoc === 'string' ? roleFromDoc : rolesFromDoc[0]);

  return {
    ...plain,
    id: user._id.toString(),
    _id: user._id.toString(),
    tenantId,
    siteId,
    role: role ? String(role) : undefined,
    roles: rolesFromDoc.length > 0 ? rolesFromDoc : role ? [String(role)] : undefined,
  };
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      res.status(401).json({ message: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ message: 'Missing or invalid Authorization header' });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
    if (!decoded?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(decoded.id).select('+roles +role +tenantId +siteId +email +name');

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const authedReq = req as AuthedRequest;
    const plainUser = toPlainUser(user, decoded) as any;

    authedReq.user = plainUser;
    if (plainUser.tenantId) {
      authedReq.tenantId = String(plainUser.tenantId);
    }
    if (plainUser.siteId) {
      authedReq.siteId = String(plainUser.siteId);
    }

    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Auth Error:', err instanceof Error ? err.message : err);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export const requireRole = (...allowed: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const roles = ((req as AuthedRequest).user as any)?.roles as UserRole[] | undefined;
    if (!roles || !allowed.some((role) => roles.includes(role))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };

export default {
  requireAuth,
  requireRole,
};
