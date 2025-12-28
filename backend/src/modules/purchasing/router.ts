/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import {
  createPurchasingOrderHandler,
  listPurchasingOrdersHandler,
  receivePurchasingOrderHandler,
  sendPurchasingOrderHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('inventory.read'), listPurchasingOrdersHandler);
router.post('/', requirePermission('inventory.purchase'), createPurchasingOrderHandler);
router.post('/:orderId/send', requirePermission('inventory.purchase'), sendPurchasingOrderHandler);
router.post('/:orderId/receive', requirePermission('inventory.purchase'), receivePurchasingOrderHandler);

export default router;
