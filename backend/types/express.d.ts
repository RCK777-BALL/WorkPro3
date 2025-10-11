import type { Types } from 'mongoose';
import type { UserRole } from './auth';

declare module 'express-serve-static-core' {
  interface Request {
    // req.user is optional at type level; controllers must guard before using it.
    user?: {
      _id?: Types.ObjectId | string;
      id?: string;
      email?: string;
      name?: string;
      role?: string;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      roles?: UserRole[];
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    };
    tenantId?: string;
    siteId?: string;
    vendorId?: string;
    thirdParty?: any;
  }
}

export {};
