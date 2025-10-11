/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler, Response } from 'express';
import type { ApiResult } from '../../../shared/types/http';

export const ok = <T>(res: Response, data: T, status = 200) => {
  const body: ApiResult<T> = { data, error: undefined };
  return res.status(status).json(body);
};

export const fail = (
  res: Response,
  error: unknown,
  status = 400,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const body: ApiResult<never> = { data: undefined, error: message };
  return res.status(status).json(body);
};

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default { ok, fail, asyncHandler };
