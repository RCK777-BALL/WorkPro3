/*
 * SPDX-License-Identifier: MIT
 */

import type { Permission } from '../shared/permissions';
import type { UserRole } from '../types/auth';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      tenantId?: string;
      siteId?: string;
      plantId?: string;
      roles?: UserRole[] | string[];
      permissions?: Permission[];
      scopes?: string[];
      client?: string;
    }

    interface Request {
      user?: User;
      tenantId?: string;
      tenantDomain?: string;
      siteId?: string;
      departmentId?: string;
      plantId?: string;
      permissions?: string[];
    }
  }
}

export {};
