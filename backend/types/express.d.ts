import 'express';
import type { UserRole } from './auth';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      tenantId?: string;
      roles?: UserRole[];
    }

    interface Request {
      user?: User;
      tenantId?: string;
      siteId?: string;
    }
  }
}

export {};
