/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

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
    res.status(status).json({ message: err.message || 'Internal Server Error' });
    return;
  }

  res.status(500).json({ message: 'Internal Server Error' });
};

export default errorHandler;
