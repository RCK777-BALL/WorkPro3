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


/**
 * Return the authenticated user's payload from the request.
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    next(err);
    return;
  }
};
 
 /**
 * Clear the authentication token cookie and end the session.
 */
export const logout = (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  res.clearCookie('auth', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isCookieSecure(),
  });
  res.json({ message: 'ok' });
  return;
};
 

/**
 * Placeholder MFA setup handler. In a real implementation this would
 * generate and return a secret for the user to configure their MFA device.
 */
export const setupMfa = (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  sendResponse(res, null, 'MFA setup not implemented', 501);
  return;
};

/**
 * Placeholder MFA token validation handler.
 */
export const validateMfaToken = (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  sendResponse(res, null, 'MFA token validation not implemented', 501);
  return;
};

