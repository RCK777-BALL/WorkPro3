/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import type { Request, RequestHandler } from 'express';
import User from '../models/User';
import type { AuthedRequest } from '../types/http';

interface TokenPayload {
  id?: string;
  tenantId?: string;
  role?: string;
  siteId?: string;
}

const toStringSafe = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString(): string }).toString();
  }
  return undefined;
};

const sendUnauthorized = (res: Parameters<RequestHandler>[1], message: string) => {
  res.status(401).json({ error: { code: 401, message } });
};

const sendServerError = (res: Parameters<RequestHandler>[1], message: string) => {
  res.status(500).json({ error: { code: 500, message } });
};

const extractToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.slice('Bearer '.length).trim();
    if (candidate) {
      return candidate;
    }
  }

  const cookies = (req as Request & { cookies?: Record<string, unknown> }).cookies;
  if (cookies) {
    const cookieKeys = ['auth', 'access_token', 'token'];
    for (const key of cookieKeys) {
      const value = cookies[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return undefined;
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authedReq = req as AuthedRequest;

  const token = extractToken(req);

  if (!token) {
    sendUnauthorized(res, 'Missing authentication token');
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    sendServerError(res, 'Server configuration issue');
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;

    if (!decoded?.id) {
      sendUnauthorized(res, 'Unauthorized: Invalid token');
      return;
    }

    const user = await User.findById(decoded.id)
      .select('-passwordHash')
      .lean<Record<string, unknown> | null>();

    if (!user) {
      sendUnauthorized(res, 'Unauthorized: Invalid token');
      return;
    }

    const tenantId = decoded.tenantId ?? toStringSafe((user as { tenantId?: unknown }).tenantId);
    const siteId = decoded.siteId ?? toStringSafe((user as { siteId?: unknown }).siteId);
    const rolesSource = (user as { roles?: unknown }).roles;
    const normalizedRoles = Array.isArray(rolesSource)
      ? rolesSource.map((role) => String(role))
      : [];
    const decodedRole = decoded.role ? String(decoded.role) : undefined;
    const primaryRole = decodedRole ?? normalizedRoles[0] ?? 'tech';
    const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));

    authedReq.user = {
      id: toStringSafe((user as { _id?: unknown })._id) ?? decoded.id,
      _id: toStringSafe((user as { _id?: unknown })._id) ?? decoded.id,
      email: (user as { email?: unknown }).email,
      name: (user as { name?: unknown }).name,
      tenantId,
      siteId,
      role: primaryRole,
      roles,
    } as Record<string, unknown>;

    if (tenantId) {
      req.tenantId = tenantId;
    }

    if (siteId) {
      req.siteId = siteId;
    }

    next();
  } catch {
    sendUnauthorized(res, 'Unauthorized: Invalid token');
  }
};
