import type { Request, RequestHandler } from 'express';

import { Types } from 'mongoose';
import type { UserRole } from '../../models/User';

export interface RequestUser {
  id?: string;
  _id?: Types.ObjectId | string;
  email: string;
  roles?: UserRole[];
  tenantId?: string;
   siteId?: string;
  vendorId?: string;
  vendor?: any;
  thirdParty?: any;
}

export type AuthedRequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> = RequestHandler<P, ResBody, ReqBody, ReqQuery>;

declare global {
  interface RequestUser {
    id?: string;
    _id?: Types.ObjectId | string;
    email: string;
    roles?: UserRole[];
    tenantId?: string;
    theme?: 'light' | 'dark' | 'system';
    colorScheme?: string;
  }

  namespace Express {
    interface User extends RequestUser {
      email: string;
    }

    interface Request {
      user?: RequestUser;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      vendor?: any;
      thirdParty?: any;
    }
  }
 
}

export {};
