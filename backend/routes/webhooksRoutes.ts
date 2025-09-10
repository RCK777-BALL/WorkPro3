import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { handleWorkOrderHook } from '../controllers/WebhookController';
import { requireThirdPartyAuth } from '../middleware/thirdPartyAuth';
import Webhook from '../models/Webhook';
import idempotency from '../middleware/idempotency';

const router = express.Router();

// Subscribe to events
router.post('/subscribe', idempotency, async (
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

// Work order webhook
router.post('/workorder', requireThirdPartyAuth, handleWorkOrderHook);

export default router;
