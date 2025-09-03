import { Request, Response, NextFunction } from 'express';

export type RequestUser = { id: string; email?: string; role?: string; _id?: string };

export type AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  Request<P, ResBody, ReqBody, ReqQuery> & { user?: RequestUser; tenantId?: string };

export type AuthedRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  (req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) =>
    void | Promise<void>;
