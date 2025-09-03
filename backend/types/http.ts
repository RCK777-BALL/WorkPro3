import { Request, Response, NextFunction } from 'express';

export type RequestUser = {
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
};

export type AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  Request<P, ResBody, ReqBody, ReqQuery> & {
    user?: RequestUser;
    tenantId?: string;
  };

/**
 * Allow common Express patterns like:
 *   return res.json(...), return res.status(...).json(...), or just res.json(...)
 */
export type AuthedRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  (
    req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => void | Response<any> | Promise<void | Response<any>>;

 
