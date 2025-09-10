import { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import type { UserRole } from '../../models/User';

declare global {
  interface RequestUser {
    id?: string;
    _id?: Types.ObjectId | string;
    email: string;
    role?: UserRole;
    tenantId?: string;
    theme?: 'light' | 'dark' | 'system';
    colorScheme?: string;
  }

  type AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
    Request<P, ResBody, ReqBody, ReqQuery>;
  type AuthedRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
    RequestHandler<P, ResBody, ReqBody, ReqQuery>;

  namespace Express {
    interface User extends RequestUser {
      email: string;
    }

    interface Request {
      user?: RequestUser;
      tenantId?: string;
      siteId?: string;
      thirdParty?: any;
    }
  }
}

export {};
