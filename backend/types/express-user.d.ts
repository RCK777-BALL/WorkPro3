import 'express';
import type { UserRole } from './http';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: Types.ObjectId | string;
      email?: string;
      role?: UserRole;
      tenantId?: string; // <-- added
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: Express.User;
    tenantId?: string;
    siteId?: string; // optional if used in controllers
  }
}

export {};
