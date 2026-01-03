/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import subscriptionsRouter from './routes/subscriptions';
import preferencesRouter from './routes/preferences';
import deliveryLogsRouter from './routes/deliveryLogs';

const router = Router();

router.use('/subscriptions', subscriptionsRouter);
router.use('/preferences', preferencesRouter);
router.use('/delivery-logs', deliveryLogsRouter);

export default router;
