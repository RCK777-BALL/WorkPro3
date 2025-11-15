/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { listNotificationProvidersHandler, sendNotificationTestHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/notifications/providers', listNotificationProvidersHandler);
router.post('/notifications/test', sendNotificationTestHandler);

export default router;
