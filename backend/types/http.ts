/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, RequestHandler, Response, User as ExpressUser } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
export type { ApiResult } from '../../shared/types/http';

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery, Locals>, 'user'> & {
  user?: ExpressUser | undefined;
  tenantId?: string | undefined;
  tenantDomain?: string | undefined;
  siteId?: string | undefined;
  departmentId?: string | undefined;
  plantId?: string | undefined;
  permissions?: string[] | undefined;
};

export interface AuthedRequestHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> extends RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  (
    req: AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ): void | Promise<void>;
}
