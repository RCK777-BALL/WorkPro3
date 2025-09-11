/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { createPurchaseOrder, getPurchaseOrder } from '../controllers/PurchaseOrderController';

const router = Router();

router.post('/', createPurchaseOrder);
router.get('/:id', getPurchaseOrder);

export default router;
