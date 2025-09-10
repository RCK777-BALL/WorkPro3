import type { RequestHandler, Request, ParamsDictionary } from 'express';
import type { ParsedQs } from 'qs';

export type AuthedRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = RequestHandler<P, ResBody, ReqBody, ReqQuery>;

export type AuthedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = Request<P, ResBody, ReqBody, ReqQuery>;
