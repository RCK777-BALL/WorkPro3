/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'crypto';
import type { Request, Response, RequestHandler as ExpressRequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant';
import User from '../models/User';
import {
  type JwtUser,
  clearAuthCookies,
  setAuthCookies,
  signAccess,
  signRefresh,
  logger,
} from '../utils';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { resolveUserPermissions } from '../services/permissionService';

const DEFAULT_TENANT_NAME = 'Default Tenant';

const ROLE_PRIORITY = [
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
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

const normalizeClient = (client: unknown): string | undefined => {
  if (typeof client !== 'string') {
    return undefined;
  }
  const normalized = client.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const scopesForClient = (client?: string): string[] => {
  if (client === 'mobile') {
    return ['mobile:access'];
  }
  return ['web:access'];
};

type JwtPayloadOptions = { scopes?: string[]; client?: string | undefined };

function buildJwtPayload(
  user: { _id: unknown; email: string; tenantId?: unknown; roles?: string[]; role?: string; siteId?: unknown },
  options: JwtPayloadOptions = {},
): JwtUser {
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

  if (options.scopes && options.scopes.length > 0) {
    payload.scopes = options.scopes;
  }

  if (options.client) {
    payload.client = options.client;
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

type HandlerRequest = Request | AuthedRequest;

type HandlerLogic<Req extends HandlerRequest> = (req: Req, res: Response) => Promise<void> | void;

const baseHandler = <Req extends HandlerRequest>(
  handler: HandlerLogic<Req>,
  name?: string,
): ExpressRequestHandler => {
  const wrapped: ExpressRequestHandler = async (req, res, next) => {
    try {
      await handler(req as Req, res);
    } catch (error) {
      const label = name ?? handler.name ?? 'anonymous';
      logger.error(`Unhandled error in auth controller handler "${label}"`, error);
      next(error);
    }
  };

  return wrapped;
};

const requestHandler = <Req extends Request>(handler: HandlerLogic<Req>, name?: string) =>
  baseHandler<Req>(handler, name);

const authedRequestHandler = <Req extends AuthedRequest>(
  handler: HandlerLogic<Req>,
  name?: string,
) => baseHandler<Req>(handler, name) as AuthedRequestHandler;

export const register: ExpressRequestHandler = requestHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const normalizedEmail = normalizeEmail(email);

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409).json({
      error: { code: 409, message: 'Email already in use' },
    });
    return;
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

  res.status(201).json({
    data: { id: payload.id, email: payload.email },
  });
}, 'register');

export const login: ExpressRequestHandler = requestHandler(async (req, res) => {
  const { email, username, password, client: rawClient } = req.body as {
    email?: string;
    username?: string;
    password?: string;
    client?: string;
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
  const primaryRoleFromUser = derivePrimaryRole((user as any).role, normalizedRoles);
  const fallbackRoles = Array.from(new Set([primaryRoleFromUser, ...normalizedRoles]));

  const client = normalizeClient(rawClient);
  const scopes = scopesForClient(client);

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

  const permissionInput: Parameters<typeof resolveUserPermissions>[0] = {
    userId: user._id,
    fallbackRoles,
  };

  if (tenantId) {
    permissionInput.tenantId = tenantId;
  }

  if (siteId) {
    permissionInput.siteId = siteId;
  }

  const { roles: resolvedRoles, permissions } = await resolveUserPermissions(permissionInput);

  const roles = resolvedRoles.length > 0 ? resolvedRoles : fallbackRoles;
  const primaryRole = derivePrimaryRole((user as any).role, roles);

  const jwtOptions: JwtPayloadOptions = { scopes };
  if (client) {
    jwtOptions.client = client;
  }

  const tokenPayload = buildJwtPayload(
    {
      _id: user._id,
      email: user.email,
      tenantId: user.tenantId,
      siteId,
      roles,
      role: primaryRole,
    },
    jwtOptions,
  );

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
      scopes,
      client,
      permissions,
    },
  });
}, 'login');

export const me: AuthedRequestHandler = authedRequestHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
    return;
  }
  res.json({ data: { user: req.user } });
}, 'me');

export const refresh: ExpressRequestHandler = requestHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: { code: 401, message: 'Missing refresh token' } });
    return;
  }

  let decoded: JwtUser | null = null;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET ?? '') as JwtUser;
  } catch (err) {
    logger.warn('Failed to refresh token', err);
  }

  if (!decoded?.id) {
    clearAuthCookies(res);
    res.status(401).json({ error: { code: 401, message: 'Invalid refresh token' } });
    return;
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

  if (decoded.scopes) {
    payload.scopes = decoded.scopes;
  }

  if (decoded.client) {
    payload.client = decoded.client;
  }

  const access = signAccess(payload);
  const refreshToken = signRefresh(payload);
  setAuthCookies(res, access, refreshToken, { remember: true });
  res.json({ data: { user: payload } });
}, 'refresh');

export const logout: ExpressRequestHandler = requestHandler(async (_req, res) => {
  clearAuthCookies(res);
  res.json({ data: { ok: true } });
}, 'logout');
