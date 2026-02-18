/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User from '../../models/User';
import type { AuthedRequest } from '../../types/http';
import type { Permission } from '../../shared/permissions';
import { assertPermission } from './permissions';
import type { UserRole } from '../../types/auth';

export type TenantScopedRequest = AuthedRequest & {
  siteId?: string | null;
  departmentId?: string | null;
  user?:
    | (NonNullable<AuthedRequest['user']> & {
        siteId?: string | null;
        roles?: Array<UserRole | string>;
      })
    | undefined;
};

type PermissionGuard = Permission | Permission[] | RequestHandler;

interface PolicyOptions {
  roles?: UserRole[];
  permissions?: PermissionGuard;
  siteScoped?: boolean;
  departmentScoped?: boolean;
}

const normalizeTenantId = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (Types.ObjectId.isValid(value)) return value;
  try {
    return String(new Types.ObjectId(value));
  } catch {
    return undefined;
  }
};

export const ensureTenantContext = (req: TenantScopedRequest): string | undefined => {
  if (req.tenantId) return req.tenantId;
  const tenantFromUser = typeof req.user?.tenantId === 'string' ? req.user.tenantId : undefined;
  const tenantFromHeader = typeof req.header === 'function' ? req.header('x-tenant-id') : undefined;
  const tenantId = normalizeTenantId(tenantFromUser ?? tenantFromHeader ?? null);
  if (tenantId) {
    req.tenantId = tenantId;
  }
  return tenantId;
};

export const withPolicyGuard = (options: PolicyOptions = {}): RequestHandler[] => {
  const handlers: RequestHandler[] = [];

  handlers.push((req, res, next) => {
    const tenantId = ensureTenantContext(req as TenantScopedRequest);
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context is required' });
      return;
    }
    next();
  });

  if (options.roles?.length) {
    handlers.push((req, res, next) => {
      const roles = (req.user?.roles ?? []) as UserRole[];
      if (!roles.some((role) => options.roles?.includes(role))) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      next();
    });
  }

  if (options.permissions) {
    if (typeof options.permissions === 'function') {
      handlers.push(options.permissions as RequestHandler);
    } else {
      const permissions = Array.isArray(options.permissions) ? options.permissions : [options.permissions];
      handlers.push(async (req, res, next) => {
        try {
          for (const permission of permissions) {
            await assertPermission(req as AuthedRequest, permission as Permission);
          }
          next();
        } catch (error) {
          const status = (error as { status?: number }).status ?? 403;
          res.status(status).json({ message: status === 401 ? 'Unauthorized' : 'Forbidden' });
        }
      });
    }
  }

  if (options.siteScoped) {
    handlers.push((req, res, next) => {
      const siteId = req.siteId ?? req.user?.siteId ?? null;
      if (!siteId) {
        res.status(400).json({ message: 'Site context is required' });
        return;
      }
      req.siteId = String(siteId);
      next();
    });
  }

  if (options.departmentScoped) {
    handlers.push((req, res, next) => {
      const departmentId = (req as TenantScopedRequest).departmentId ?? null;
      if (!departmentId) {
        res.status(400).json({ message: 'Department context is required' });
        return;
      }
      (req as TenantScopedRequest).departmentId = String(departmentId);
      next();
    });
  }

  return handlers;
};

interface SocketAuthResult {
  userId: string;
  tenantId: string;
  roles: UserRole[];
  name?: string | null;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
};

export const authorizeSocketTenant = async (socket: Socket): Promise<SocketAuthResult> => {
  const token =
    (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth?.token) ||
    (typeof socket.handshake.headers.authorization === 'string'
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
      : undefined);

  if (!token) throw new Error('Missing token');

  const decoded = jwt.verify(token, getJwtSecret()) as { id?: string; tenantId?: string };
  if (!decoded?.id) throw new Error('Invalid token');

  const user = await User.findById(decoded.id).select('_id tenantId roles name');
  if (!user) throw new Error('User not found');

  const tenantId = decoded.tenantId ?? (user.tenantId ? String(user.tenantId) : undefined);
  if (!tenantId) throw new Error('Tenant not found');

  return {
    userId: String(user._id),
    tenantId,
    roles: Array.isArray(user.roles) ? (user.roles as UserRole[]) : [],
    name: user.name,
  };
};

export const scopeQueryToTenant = (
  match: Record<string, unknown>,
  tenantId: string,
  siteId?: string | null,
  { siteScoped }: { siteScoped?: boolean } = {},
): Record<string, unknown> => {
  const scoped: Record<string, unknown> = { ...match, tenantId: new Types.ObjectId(tenantId) };
  if (siteScoped) {
    if (siteId) {
      scoped.siteId = new Types.ObjectId(siteId);
    } else {
      scoped.siteId = { $exists: false };
    }
  }
  return scoped;
};

export default {
  ensureTenantContext,
  withPolicyGuard,
  authorizeSocketTenant,
  scopeQueryToTenant,
};
