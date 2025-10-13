/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { sendResponse } from '../utils/sendResponse';
import { isCookieSecure } from '../utils/isCookieSecure';

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


function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildJwtPayload(user: { _id: unknown; email: string; tenantId?: unknown; roles?: string[]; role?: string; siteId?: unknown }): JwtUser {
  return {
    id: String(user._id),
    email: user.email,
    tenantId: user.tenantId ? String(user.tenantId) : undefined,
    siteId: user.siteId ? String(user.siteId) : undefined,
    role:
      Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles[0]
        : user.role,
  };
}

async function ensureDefaultTenant() {
  let tenant = await Tenant.findOne({ name: DEFAULT_TENANT_NAME });
  if (!tenant) {
    tenant = await Tenant.create({ name: DEFAULT_TENANT_NAME });
  }
  return tenant;
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        error: { code: 409, message: 'Email already in use' },
      });
    }

    const tenant = await ensureDefaultTenant();
    const name = normalizedEmail.split('@')[0] || 'User';

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: password,
      roles: ['admin'],
      tenantId: tenant._id,
      employeeId: randomUUID(),
    });

    const payload = buildJwtPayload(user);

    return res.status(201).json({
      data: { id: payload.id, email: payload.email },
    });
  } catch (err) {
    logger.error('Failed to register user', err);
    return res.status(500).json({
      error: { code: 500, message: 'Unable to register user' },
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const sessionUser = (req as any).user;
    if (!sessionUser?.id) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }

    const dbUser = await User.findById(sessionUser.id)
      .select(
        '+tenantId +roles +tokenVersion +email +name +avatar +theme +colorScheme +siteId',
      )
      .lean<Record<string, unknown> | null>();

    if (!dbUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const normalizedRoles = normalizeRoles((dbUser as { roles?: unknown }).roles);
    const primaryRole = derivePrimaryRole((dbUser as { role?: unknown }).role, normalizedRoles);
    const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));
    const tenantId = (dbUser as { tenantId?: any }).tenantId
      ? ((dbUser as { tenantId?: any }).tenantId as any).toString()
      : sessionUser.tenantId;
    const userId = ((dbUser as { _id?: any })._id ?? (dbUser as { id?: any }).id ?? sessionUser.id).toString();

    const { passwordHash, passwordResetToken, passwordResetExpires, mfaSecret, ...safeUser } = dbUser;

    res.json({
      user: {
        ...safeUser,
        id: userId,
        _id: userId,
        tenantId,
        role: primaryRole,
        roles,
      },
    });
    return;
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({ error: { code: 500, message: 'Unable to sign in' } });
  }
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
  }
  return res.json({ data: { user: req.user } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (!token) {
    return res.status(401).json({ error: { code: 401, message: 'Missing refresh token' } });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET ?? '') as JwtUser;
    if (!decoded?.id) {
      throw new Error('Invalid refresh token payload');
    }
    const payload: JwtUser = {
      id: decoded.id,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: decoded.role,
      siteId: decoded.siteId,
    };
    const access = signAccess(payload);
    const refreshToken = signRefresh(payload);
    setAuthCookies(res, access, refreshToken, { remember: true });
    return res.json({ data: { user: payload } });
  } catch (err) {
    logger.warn('Failed to refresh token', err);
    clearAuthCookies(res);
    return res.status(401).json({ error: { code: 401, message: 'Invalid refresh token' } });
  }
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  return res.json({ data: { ok: true } });
}
