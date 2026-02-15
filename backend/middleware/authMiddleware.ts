/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler, Request, Response, NextFunction } from 'express';
import type { HydratedDocument } from 'mongoose';
import jwt from 'jsonwebtoken';

import User from '../models/User';
import type { UserDocument, UserRole } from '../models/User';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { resolveUserPermissions } from '../services/permissionService';
import type { Permission } from '../shared/permissions';
import { isSessionBindingValid, type SessionBinding } from '../utils/sessionBinding';

type DecodedToken = {
  id?: string;
  tenantId?: string;
  role?: string;
  siteId?: string;
  scopes?: unknown;
  client?: string;
  session?: SessionBinding;
};

const normalizeScopes = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set<string>();
  for (const scope of input) {
    if (typeof scope === 'string' && scope.trim()) {
      unique.add(scope.trim());
    }
  }
  return Array.from(unique.values());
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value && typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString(): string }).toString();
  }
  return undefined;
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
    scopes: normalizeScopes(decoded.scopes),
    client: decoded.client,
  };
};

export const requireAuth: AuthedRequestHandler = async (req, res, next) => {
  try {
    const rawAuthHeader = req.headers.authorization;
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;

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

    if (!isSessionBindingValid(decoded.session, req)) {
      res.status(401).json({ message: 'Session binding failed' });
      return;
    }

    const user = await User.findById(decoded.id).select('+roles +role +tenantId +siteId +email +name +active');

    if (!user || user.active === false) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const plainUser = toPlainUser(user, decoded) as any;

    const tenantId = toStringOrUndefined(req.header('x-tenant-id')) ?? toStringOrUndefined(plainUser.tenantId);
    if (!tenantId) {
      res.status(401).json({ message: 'Tenant not found' });
      return;
    }
    const siteId = toStringOrUndefined(req.header('x-site-id')) ?? toStringOrUndefined(plainUser.siteId);

    const { roles, permissions } = await resolveUserPermissions({
      userId: user._id,
      tenantId,
      siteId,
      fallbackRoles: Array.isArray(plainUser.roles) ? plainUser.roles : [],
    });

    if (roles.length > 0) {
      plainUser.roles = roles;
    }
    (plainUser as { permissions?: Permission[] }).permissions = permissions;

    const authedReq = req as AuthedRequest;
    authedReq.user = plainUser;
    authedReq.tenantId = tenantId;
    if (siteId) {
      authedReq.siteId = siteId;
    }
    if (permissions && permissions.length > 0) {
      authedReq.permissions = permissions;
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
    const authedReq = req as AuthedRequest;
    if (!authedReq.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const roles = Array.isArray(authedReq.user.roles)
      ? authedReq.user.roles.map((role: UserRole | string) => String(role))
      : [];
    if (!allowed.some((role) => roles.includes(role))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };

export const requireScopes = (...required: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (required.length === 0) {
      next();
      return;
    }

    const scopes = ((req as AuthedRequest).user as any)?.scopes as string[] | undefined;
    if (!Array.isArray(scopes) || !required.every((scope) => scopes.includes(scope))) {
      res.status(403).json({ message: 'Forbidden: missing scope' });
      return;
    }
    next();
  };

export default {
  requireAuth,
  requireRole,
  requireScopes,
};
