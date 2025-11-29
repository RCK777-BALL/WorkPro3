/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendResponse } from '../utils/sendResponse';
import { sendNotificationTest } from '../src/modules/integrations/service';


/**
 * Handle incoming work order webhook events. The endpoint currently just
 * acknowledges receipt and logs the payload.
 */
export async function handleWorkOrderHook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // In a real implementation the payload could be validated and used to
    // create or update work orders. For now we simply log it.
    logger.info('Webhook received:', req.body);
    sendResponse(res, { status: 'received' });
  } catch (err) {
    next(err);
    return;
  }
}

export async function relaySlackWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = req.body?.message ?? req.body?.text ?? 'Webhook received';
    const subject = req.body?.subject;
    const webhookUrl = req.body?.webhookUrl;
    const result = await sendNotificationTest({
      provider: 'slack',
      message,
      ...(subject ? { subject } : {}),
      ...(webhookUrl ? { webhookUrl } : {}),
    });
    sendResponse(res, result, null, 202);
  } catch (err) {
    next(err);
  }
}

export async function relayTeamsWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = req.body?.message ?? req.body?.text ?? 'Webhook received';
    const subject = req.body?.subject;
    const webhookUrl = req.body?.webhookUrl;
    const result = await sendNotificationTest({
      provider: 'teams',
      message,
      ...(subject ? { subject } : {}),
      ...(webhookUrl ? { webhookUrl } : {}),
    });
    sendResponse(res, result, null, 202);
  } catch (err) {
    next(err);
  }
}
