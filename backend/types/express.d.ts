import 'express';

declare global {
  namespace Express {
    interface User {
      id?: string;
      _id?: string;
      tenantId?: string;
      role?: string;
    }

    interface Request {
      user?: User;
      tenantId?: string;
      siteId?: string;
    }
  }
}

export {};
