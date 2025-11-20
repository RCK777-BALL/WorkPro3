/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  updatePurchaseOrderStatus,
} from '../controllers/PurchaseOrderController';

const router = Router();

router.post('/', createPurchaseOrder);
router.get('/', listPurchaseOrders);
router.get('/:id', getPurchaseOrder);
router.post('/:id/status', updatePurchaseOrderStatus);
router.post('/:id/receive', receivePurchaseOrder);

export default router;
