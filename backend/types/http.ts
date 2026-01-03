import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary, User } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
export type { ApiResult } from '../../shared/types/http';

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery, Locals>, 'user'> & {
  user?: User | undefined;
  tenantId?: string | undefined;
  tenantDomain?: string | undefined;
  siteId?: string | undefined;
  departmentId?: string | undefined;
  plantId?: string | undefined;
  permissions?: string[] | undefined;
};

export type AuthedRequestHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> & ((
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => void | Promise<void>);

export type AuthedRequestWithUser<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals> & {
  user: User;
};

export type TenantScopedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = AuthedRequestWithUser<P, ResBody, ReqBody, ReqQuery, Locals> & {
  tenantId: string;
};
