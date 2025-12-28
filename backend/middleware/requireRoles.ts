/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/auth';
import { ROLES } from '../types/auth';

// Middleware to ensure the authenticated user has one of the required roles
const ROLE_EQUIVALENTS: Partial<Record<UserRole, UserRole[]>> = {
  admin: ['general_manager'],
  general_manager: ['admin'],
  supervisor: ['assistant_general_manager'],
  assistant_general_manager: ['supervisor'],
  manager: ['operations_manager'],
  operations_manager: ['manager'],
};

const expandRoles = (roles: UserRole[]): UserRole[] => {
  const expanded = new Set<UserRole>();
  roles.forEach((role) => {
    expanded.add(role);
    const equivalents = ROLE_EQUIVALENTS[role];
    equivalents?.forEach((eq) => expanded.add(eq));
  });
  return Array.from(expanded);
};

const isUserRole = (role: string): role is UserRole =>
  (ROLES as readonly string[]).includes(role);

const normalizeUserRoles = (roles?: Array<UserRole | string>): UserRole[] =>
  (roles ?? []).filter(isUserRole);

const requireRoles =
  (roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRoles = normalizeUserRoles(req.user.roles);
    const isAdmin = userRoles.includes('admin');
    const allowedRoles = expandRoles(roles);
    if (allowedRoles.length > 0 && !allowedRoles.some((role) => userRoles.includes(role))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const tenantParam =
      req.params.tenantId || req.header('x-tenant-id') || req.tenantId;
    if (
      !isAdmin &&
      tenantParam &&
      req.user.tenantId &&
      tenantParam !== req.user.tenantId
    ) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };

export default requireRoles;
export { requireRoles };
