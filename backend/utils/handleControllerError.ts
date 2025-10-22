/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import logger from './logger';

const handleControllerError = (res: Response, err: unknown, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  logger.error('Controller error', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
};

export default handleControllerError;
