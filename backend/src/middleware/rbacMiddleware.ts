/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { requirePermission, type Permission } from '../auth/permissions';

export const rbacMiddleware = (permission: Permission): RequestHandler => requirePermission(permission);

export const rbacAnyOf = (permissions: Permission[]): RequestHandler => {
  return async (req, res, next) => {
    for (const permission of permissions) {
      try {
        await requirePermission(permission)(req, res, () => undefined);
        return next();
      } catch (error) {
        // ignore and try next permission
      }
    }

    res.status(403).json({ message: 'Insufficient permissions' });
  };
};
