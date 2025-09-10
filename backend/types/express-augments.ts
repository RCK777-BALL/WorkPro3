// types/express-augments.ts
import type { Request } from 'express';

type AuthedRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  user?: { id?: string; _id?: string; tenantId?: string };
  tenantId?: string;
  siteId?: string;
};

type AuthedRequestHandler<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>, res: any, next: any) => any;

export type { AuthedRequest, AuthedRequestHandler };
