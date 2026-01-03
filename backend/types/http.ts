import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface AuthedRequest<
  TParams = any,
  TResBody = any,
  TReqBody = any,
  TQuery = any
> extends Request<TParams, TResBody, TReqBody, TQuery> {
  user?: {
    id: string;
    email?: string;
    roles?: string[];
  };
  tenantId?: string;
  siteId?: string;
}

export type AuthedRequestHandler<
  TParams = any,
  TResBody = any,
  TReqBody = any,
  TQuery = any
> = (
  req: AuthedRequest<TParams, TResBody, TReqBody, TQuery>,
  res: Response<TResBody>,
  next: NextFunction
) => Promise<any> | void;
