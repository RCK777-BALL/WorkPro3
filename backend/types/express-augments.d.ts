import type { RequestUser } from './express';

declare global {
  namespace Express {
    interface User extends RequestUser {
      email: string;
    }

    interface Request {
      user?: RequestUser;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      thirdParty?: any;
    }
  }
}

export {};

