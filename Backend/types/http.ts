// backend/types/http.ts
import type { Request, Response, NextFunction } from 'express';

export type RequestUser = {
  id?: string;
  _id?: string;
  tenantId?: string;
  role?: string;
};

export type AuthedRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  user?: RequestUser;
  tenantId?: string;
  siteId?: string;
};

export type AuthedRequestHandler<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void>;
