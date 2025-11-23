/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary, User as ExpressUser } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { Types } from 'mongoose';

export type { ApiResult } from '@shared/http';

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> = Omit<Request<P, ResBody, ReqBody, ReqQuery, Locals>, 'user'> & {
  user?:
    | (ExpressUser & {
        tenantId?: string | undefined;
        id?: string | Types.ObjectId | undefined;
        _id?: string | Types.ObjectId | undefined;
        scopes?: string[] | undefined;
        client?: string | undefined;
      })
    | undefined;
  tenantId?: string | undefined;
  tenantDomain?: string | undefined;
  siteId?: string | undefined;
  plantId?: string | undefined;
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
