/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendResponse } from '../utils/sendResponse';

const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(err);

  if (err instanceof Error) {
    const status =
      (err as { status?: number }).status ||
      (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
    sendResponse(res, null, err.message || 'Internal Server Error', status);
    return;
  }

  sendResponse(res, null, 'Internal Server Error', 500);
};

export default errorHandler;
