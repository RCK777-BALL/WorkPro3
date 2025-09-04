import 'express';
import type { Role } from './http';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      email?: string;
      role?: Role;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: Express.User;
    tenantId?: string;
  }
}

export {};
