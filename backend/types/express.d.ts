import 'express';

import type { Types } from 'mongoose';
import type { UserRole } from './auth';

declare global {
  namespace Express {
    interface User {
      id: string;
      _id?: Types.ObjectId | string;
      email?: string;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      role?: string;
      roles?: UserRole[];
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    }

    interface Request {
      user?: User;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      thirdParty?: any;
    }
  }
}

export {};
