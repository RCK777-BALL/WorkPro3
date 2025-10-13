/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Tenant from '../models/Tenant';
import { signAccess, signRefresh, setAuthCookies, clearAuthCookies, type JwtUser } from '../utils/jwt';
import logger from '../utils/logger';

const DEFAULT_TENANT_NAME = 'Default Tenant';

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
    const { email, password, remember } = req.body as { email: string; password: string; remember?: boolean };
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail })
      .select('+passwordHash +roles +tenantId');

    if (!user) {
      return res.status(401).json({
        error: { code: 401, message: 'Invalid credentials' },
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({
        error: { code: 401, message: 'Invalid credentials' },
      });
    }

    const payload = buildJwtPayload(user);
    const access = signAccess(payload);
    const refresh = signRefresh(payload);
    setAuthCookies(res, access, refresh, { remember: Boolean(remember) });

    return res.json({ data: { user: payload } });
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
