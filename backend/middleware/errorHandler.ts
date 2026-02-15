/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

type ErrorWithMeta = Error & { status?: number; code?: string; details?: unknown };

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const error = (err instanceof Error ? err : new Error('Internal Server Error')) as ErrorWithMeta;
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
  const isProd = process.env.NODE_ENV === 'production';

  logger.error('request_error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    status,
    code: error.code,
    message: error.message,
  });

  res.status(status).json({
    code: error.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message: status >= 500 && isProd ? 'Internal Server Error' : (error.message || 'Internal Server Error'),
    details: status >= 500 && isProd ? undefined : error.details,
    requestId: req.requestId,
  });
};

export default errorHandler;
