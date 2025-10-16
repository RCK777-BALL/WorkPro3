/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant';
import User from '../models/User';
import logger from '../utils/logger';
import {
  type JwtUser,
  clearAuthCookies,
  setAuthCookies,
  signAccess,
  signRefresh,
} from '../utils/jwt';

const DEFAULT_TENANT_NAME = 'Default Tenant';

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
  const payload: JwtUser = {
    id: String(user._id),
    email: user.email,
  };

  if (user.tenantId) {
    payload.tenantId = String(user.tenantId);
  }

  if (user.siteId) {
    payload.siteId = String(user.siteId);
  }

  const primaryRole =
    Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : user.role;

  if (primaryRole) {
    payload.role = primaryRole;
  }

  return payload;
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
    const { email, username, password } = req.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    const rawEmail = typeof email === 'string' && email.trim() ? email : username;
    if (!rawEmail || !password) {
      res.status(400).json({ error: { code: 400, message: 'Email and password are required' } });
      return;
    }

    const normalizedEmail = normalizeEmail(rawEmail);
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash +roles +role +tenantId +siteId +name +email',
    );

    if (!user || typeof user.passwordHash !== 'string') {
      res.status(401).json({ error: { code: 401, message: 'Invalid email or password' } });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: { code: 401, message: 'Invalid email or password' } });
      return;
    }

    const normalizedRoles = normalizeRoles(user.roles ?? []);
    const primaryRole = derivePrimaryRole((user as any).role, normalizedRoles);
    const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is not configured');
      res.status(500).json({ error: { code: 500, message: 'Server configuration issue' } });
      return;
    }

    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;
    const rawSiteId = (user as { siteId?: unknown }).siteId;
    const siteId =
      typeof rawSiteId === 'string'
        ? rawSiteId
        : rawSiteId && typeof (rawSiteId as { toString?: () => string }).toString === 'function'
        ? (rawSiteId as { toString(): string }).toString()
        : undefined;

    const tokenPayload = {
      id: user._id.toString(),
      role: primaryRole,
      tenantId,
      ...(siteId ? { siteId } : {}),
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        tenantId,
        siteId,
        role: primaryRole,
        roles,
      },
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: { code: 500, message: 'Unable to sign in' } });
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
    };

    if (decoded.tenantId) {
      payload.tenantId = decoded.tenantId;
    }

    if (decoded.role) {
      payload.role = decoded.role;
    }

    if (decoded.siteId) {
      payload.siteId = decoded.siteId;
    }
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
