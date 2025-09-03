import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import type { UserDocument } from '../models/User';

/**
 * Minimal user representation attached to authenticated requests.
 * `_id` and `tenantId` are optional to support partially populated users.
 */
export type RequestUser =
  Omit<Partial<LeanDocument<UserDocument>>, 'permissions'> & {
    _id?: string;
    tenantId?: string;
    permissions: string[];
  };

/**
 * Request type used in authenticated routes where `user` and `tenantId`
 * are guaranteed to be defined by the auth middleware.
 */
export interface AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: RequestUser;
  tenantId: string;
  siteId?: string;
}

export type AuthedRequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> = ((
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => Response<ResBody, Locals> | Promise<Response<ResBody, Locals> | void> | void) &
  RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>;
