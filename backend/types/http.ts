import type { RequestHandler, Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export interface ApiResult<T> {
  data?: T;
  error?: string;
}

export type AuthedRequestHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = RequestHandler<P, ApiResult<ResBody>, ReqBody, ReqQuery>;

export type AuthedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = Request<P, ApiResult<ResBody>, ReqBody, ReqQuery> & {
  user?: Express.User;
  tenantId?: string;
  siteId?: string;
};

export type AuthedResponseBody<T> = ApiResult<T>;
