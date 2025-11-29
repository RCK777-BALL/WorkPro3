/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import {
  listNotificationProvidersHandler,
  sendNotificationTestHandler,
  syncCostsHandler,
  syncPurchaseOrdersHandler,
  syncVendorsHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/notifications/providers', listNotificationProvidersHandler);
router.post('/notifications/test', sendNotificationTestHandler);
router.post('/accounting/:provider/vendors/sync', syncVendorsHandler);
router.post('/accounting/:provider/purchase-orders/sync', syncPurchaseOrdersHandler);
router.post('/accounting/:provider/costs/sync', syncCostsHandler);

export default router;
