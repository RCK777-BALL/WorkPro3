import 'express';
import type { Role } from './http';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      email?: string;
      role?: Role;
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
