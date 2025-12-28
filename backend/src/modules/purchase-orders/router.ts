/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';
import {
  cancelPurchaseOrderHandler,
  closePurchaseOrderHandler,
  listPurchaseOrdersHandler,
  receivePurchaseOrderHandler,
  savePurchaseOrderHandler,
  sendPurchaseOrderHandler,
  transitionPurchaseOrderHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('purchase_orders', { entityIdParams: ['purchaseOrderId'] }));

router.get('/', requirePermission('inventory.read'), listPurchaseOrdersHandler);
router.post('/', requirePermission('inventory.purchase'), savePurchaseOrderHandler);
router.put('/:purchaseOrderId', requirePermission('inventory.purchase'), savePurchaseOrderHandler);
router.post('/:purchaseOrderId/status', requirePermission('inventory.purchase'), transitionPurchaseOrderHandler);
router.post('/:purchaseOrderId/receive', requirePermission('inventory.purchase'), receivePurchaseOrderHandler);
router.post('/:purchaseOrderId/send', requirePermission('inventory.purchase'), sendPurchaseOrderHandler);
router.post('/:purchaseOrderId/close', requirePermission('inventory.purchase'), closePurchaseOrderHandler);
router.post('/:purchaseOrderId/cancel', requirePermission('inventory.purchase'), cancelPurchaseOrderHandler);

export default router;
