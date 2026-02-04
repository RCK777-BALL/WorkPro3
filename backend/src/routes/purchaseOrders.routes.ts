/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import tenantScope from '../../middleware/tenantScope';
import { requirePermission } from '../auth/permissions';
import {
  listPurchaseOrdersHandler,
  createPurchaseOrderHandler,
  updatePurchaseOrderHandler,
  receivePurchaseOrderHandler,
  deletePurchaseOrderHandler,
} from '../controllers/purchaseOrders.controller';
import {
  validatePurchaseOrderCreate,
  validatePurchaseOrderUpdate,
} from '../validators/purchaseOrders.validators';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('inventory.read'), listPurchaseOrdersHandler);
router.post('/', requirePermission('inventory.purchase'), validatePurchaseOrderCreate, createPurchaseOrderHandler);
router.put(
  '/:purchaseOrderId',
  requirePermission('inventory.purchase'),
  validatePurchaseOrderUpdate,
  updatePurchaseOrderHandler,
);
router.post(
  '/:purchaseOrderId/receive',
  requirePermission('inventory.purchase'),
  receivePurchaseOrderHandler,
);
router.delete('/:purchaseOrderId', requirePermission('inventory.purchase'), deletePurchaseOrderHandler);

export default router;
