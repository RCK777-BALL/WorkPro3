import { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';

export interface RequestUser {
  id?: string;
  _id?: Types.ObjectId | string;
  email?: string;
  role?: UserRole;
  tenantId?: string;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
}

export type AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  Request<P, ResBody, ReqBody, ReqQuery> & {
    user?: RequestUser;
    tenantId?: string;
    siteId?: string;
  };

export type AuthedRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  RequestHandler<P, ResBody, ReqBody, ReqQuery>;

