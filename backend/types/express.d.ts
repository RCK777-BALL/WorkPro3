/*
 * SPDX-License-Identifier: MIT
 */

import type { JwtPayload } from 'jsonwebtoken';
import type { Permission } from '../shared/permissions';
import type { UserRole } from '../types/auth';

type ThirdPartyAuth =
  | { type: 'api-key'; key: string }
  | { type: 'oauth2'; payload: string | JwtPayload };

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      email?: string;
      tenantId?: string;
      siteId?: string;
      plantId?: string;
      role?: UserRole | string;
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
      vendorId?: string;
      permissions?: Permission[];
      thirdParty?: ThirdPartyAuth;
    }
  }
}

export {};
