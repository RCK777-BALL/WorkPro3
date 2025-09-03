import express from 'express';
import { handleWorkOrderHook } from '../controllers/WebhookController';
import { requireThirdPartyAuth } from '../middleware/thirdPartyAuth';

const router = express.Router();

router.post('/workorder', requireThirdPartyAuth, handleWorkOrderHook);

export default router;
