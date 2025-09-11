import 'express';
import type { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      tenantId?: string;
      role?: UserRole;
    }

    interface Request {
      user?: User;
      tenantId?: string;
      siteId?: string;
    }
  }
}

export {};
