/*
 * SPDX-License-Identifier: MIT
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

import { handleWorkOrderHook, relaySlackWebhook, relayTeamsWebhook } from '../controllers/WebhookController';
import { requireThirdPartyAuth } from '../middleware/thirdPartyAuth';
import WebhookSubscription from '../models/WebhookSubscription';
import idempotency from '../middleware/idempotency';
import { dispatchEvent as dispatchWebhookEvent } from '../utils/webhookDispatcher';
import { apiAccessMiddleware } from '../middleware/apiAccess';
import { apiKeyAuthMiddleware } from '../middleware/apiKeyAuth';

const router = express.Router();

// Subscribe to events
router.post('/register', apiKeyAuthMiddleware, idempotency, async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { url, event, name } = req.body;
    if (!url || !event) {
      res.status(400).json({ message: 'url and event required' });
      return;
    }
    const secret = crypto.randomBytes(32).toString('hex');
    if (!req.apiKey?.tenantId) {
      res.status(400).json({ message: 'API key tenant is required' });
      return;
    }
    const hook = await WebhookSubscription.create({
      name: name ?? url,
      url,
      events: [event],
      secret,
      tenantId: req.apiKey.tenantId,
    });
    res
      .status(201)
      .json({ id: hook._id, url: hook.url, event, secret });
    return;
  } catch (err) {
    next(err);
  }
});

router.post('/event', apiKeyAuthMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
