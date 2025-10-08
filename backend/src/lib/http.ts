/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler, Response } from 'express';
import type { ApiSuccess, ApiError } from '../../../shared/types/http';

export const ok = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({ data, error: null } as ApiSuccess<T>);
};

export const fail = (
  res: Response,
  error: unknown,
  status = 400,
) => {
  const message = error instanceof Error ? error.message : String(error);
  return res
    .status(status)
    .json({ data: null, error: message } as ApiError);
};

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default { ok, fail, asyncHandler };
