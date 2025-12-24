/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
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

router.get('/notifications/providers', requirePermission('sites.read'), listNotificationProvidersHandler);
router.post('/notifications/test', requirePermission('sites.manage'), sendNotificationTestHandler);
router.post('/accounting/:provider/vendors/sync', requirePermission('inventory.manage'), syncVendorsHandler);
router.post('/accounting/:provider/purchase-orders/sync', requirePermission('inventory.purchase'), syncPurchaseOrdersHandler);
router.post('/accounting/:provider/costs/sync', requirePermission('inventory.manage'), syncCostsHandler);

export default router;
