import type { Types } from 'mongoose';
import type { UserRole } from './auth';

declare module 'express-serve-static-core' {
  interface User {
    _id?: Types.ObjectId | string | undefined;
    id?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
    role?: string | undefined;
    tenantId?: string | undefined;
    siteId?: string | undefined;
    plantId?: string | undefined;
    vendorId?: string | undefined;
    roles?: UserRole[] | string[] | undefined;
    scopes?: string[] | undefined;
    client?: string | undefined;
    permissions?: string[] | undefined;
    theme?: 'light' | 'dark' | 'system' | undefined;
    colorScheme?: string | undefined;
  }

  interface Request {
    // req.user is optional at type level; controllers must guard before using it.
    user?: User | undefined;
    tenantId?: string | undefined;
    tenantDomain?: string | undefined;
    siteId?: string | undefined;
    plantId?: string | undefined;
    departmentId?: string | undefined;
    vendorId?: string | undefined;
    vendor?: Record<string, unknown> | undefined;
    thirdParty?: any | undefined;
    permissions?: string[] | undefined;
  }
}

export {};
