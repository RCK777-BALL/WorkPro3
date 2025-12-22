/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import purchaseOrdersRouter from '../modules/purchase-orders';

const router = Router();

router.use('/', purchaseOrdersRouter);

export default router;
