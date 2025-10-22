/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendResponse } from '../utils/sendResponse';


/**
 * Handle incoming work order webhook events. The endpoint currently just
 * acknowledges receipt and logs the payload.
 */
export const handleWorkOrderHook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a real implementation the payload could be validated and used to
    // create or update work orders. For now we simply log it.
    logger.info('Webhook received:', req.body);
    sendResponse(res, { status: 'received' });
  } catch (err) {
    next(err);
  }
};
