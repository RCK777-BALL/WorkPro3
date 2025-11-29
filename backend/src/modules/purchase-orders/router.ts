/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  listPurchaseOrdersHandler,
  receivePurchaseOrderHandler,
  savePurchaseOrderHandler,
  transitionPurchaseOrderHandler,
} from './controller';

const router = Router();

router.get('/', listPurchaseOrdersHandler);
router.post('/', savePurchaseOrderHandler);
router.put('/:purchaseOrderId', savePurchaseOrderHandler);
router.post('/:purchaseOrderId/status', transitionPurchaseOrderHandler);
router.post('/:purchaseOrderId/receive', receivePurchaseOrderHandler);

export default router;
