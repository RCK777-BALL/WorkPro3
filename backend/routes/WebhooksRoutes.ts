/*
 * SPDX-License-Identifier: MIT
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

import { handleWorkOrderHook, relaySlackWebhook, relayTeamsWebhook } from '../controllers/WebhookController';
import { requireThirdPartyAuth } from '../middleware/thirdPartyAuth';
import Webhook from '../models/Webhook';
import idempotency from '../middleware/idempotency';
import { dispatchEvent as dispatchWebhookEvent } from '../utils/webhookDispatcher';
import { apiAccessMiddleware } from '../middleware/apiAccess';

const router = express.Router();

// Subscribe to events
router.post('/register', idempotency, async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { url, event } = req.body;
    if (!url || !event) {
      res.status(400).json({ message: 'url and event required' });
      return;
    }
    const secret = crypto.randomBytes(32).toString('hex');
    const hook = await Webhook.create({ url, event, secret });
    res
      .status(201)
      .json({ id: hook._id, url: hook.url, event: hook.event, secret });
    return;
  } catch (err) {
    next(err);
  }
});

router.post('/event', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { event, payload } = req.body ?? {};
    if (typeof event !== 'string' || !event.trim()) {
      res.status(400).json({ message: 'event is required' });
      return;
    }
    await dispatchWebhookEvent(event, payload ?? {});
    res.status(202).json({ status: 'queued' });
  } catch (err) {
    next(err);
  }
});

// Work order webhook
router.post('/workorder', requireThirdPartyAuth, handleWorkOrderHook);
router.post('/slack', apiAccessMiddleware, relaySlackWebhook);
router.post('/teams', apiAccessMiddleware, relayTeamsWebhook);

export default router;
