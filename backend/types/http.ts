/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export type { ApiResult } from '@shared/http';

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery>, 'user'> & {
  user?: Express.User;
};

type AuthedHandlerFn<
  P extends ParamsDictionary,
  ResBody,
  ReqBody,
  ReqQuery extends ParsedQs,
> = (
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => void | Promise<void>;

export type AuthedRequestHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
> = AuthedHandlerFn<P, ResBody, ReqBody, ReqQuery>;
