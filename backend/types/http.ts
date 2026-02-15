import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { UserRole } from './auth';
import type { Permission } from '../shared/permissions';
export type { ApiResult } from '../../shared/types/http';

type AuthedUser = Express.User & {
  roles?: Array<UserRole | string> | undefined;
  permissions?: Permission[] | string[] | undefined;
  tenantId?: string | undefined;
  siteId?: string | undefined;
  departmentId?: string | undefined;
};

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery, Locals>, 'user'> & {
  user?: AuthedUser | undefined;
  tenantId?: string | undefined;
  tenantDomain?: string | undefined;
  siteId?: string | undefined;
  departmentId?: string | undefined;
  plantId?: string | undefined;
  permissions?: Permission[] | string[] | undefined;
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
  user: AuthedUser;
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

export type VendorScopedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals> & {
  vendorId?: string | undefined;
};
