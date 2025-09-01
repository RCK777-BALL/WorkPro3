import { Request } from 'express';
import { RequestUser } from './express';

/**
 * Request type used in authenticated routes where `user` and `tenantId`
 * are guaranteed to be defined by the auth middleware.
 */
export interface AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: RequestUser;
  tenantId: string;
}
