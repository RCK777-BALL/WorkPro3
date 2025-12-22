/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

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

router.get('/', listPurchaseOrdersHandler);
router.post('/', savePurchaseOrderHandler);
router.put('/:purchaseOrderId', savePurchaseOrderHandler);
router.post('/:purchaseOrderId/status', transitionPurchaseOrderHandler);
router.post('/:purchaseOrderId/receive', receivePurchaseOrderHandler);
router.post('/:purchaseOrderId/send', sendPurchaseOrderHandler);
router.post('/:purchaseOrderId/close', closePurchaseOrderHandler);
router.post('/:purchaseOrderId/cancel', cancelPurchaseOrderHandler);

export default router;
