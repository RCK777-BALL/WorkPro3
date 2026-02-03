/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { fail } from '../src/lib/http';

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = (req as Request & { requestId?: string }).requestId;
  logger.error({ err, requestId });

  if (err instanceof Error) {
    const status =
      (err as { status?: number }).status ||
      (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
    const message = err.message || 'Internal Server Error';
    res.setHeader('X-Request-Id', requestId ?? '');
    fail(res, message, status);
    return;
  }

  res.setHeader('X-Request-Id', requestId ?? '');
  fail(res, 'Internal Server Error', 500);
};

export default errorHandler;
