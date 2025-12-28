/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import subscriptionsRouter from './routes/subscriptions';

const router = Router();

router.use('/subscriptions', subscriptionsRouter);

export default router;
