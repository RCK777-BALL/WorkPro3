/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary, User as ExpressUser } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export type { ApiResult } from '@shared/http';

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery, Locals>, 'user'> & {
  user?: ExpressUser & { tenantId?: string; id?: string; _id?: string };
  tenantId?: string;
  siteId?: string;
};

type AuthedHandlerFn<
  P extends ParamsDictionary,
  ResBody,
  ReqBody,
  ReqQuery extends ParsedQs,
  Locals extends Record<string, any>,
> = (
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => void | Promise<void>;

export type AuthedRequestHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = AuthedHandlerFn<P, ResBody, ReqBody, ReqQuery, Locals>;
