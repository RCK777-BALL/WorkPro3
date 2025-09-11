/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { createGoodsReceipt } from '../controllers/GoodsReceiptController';

const router = Router();

router.post('/', createGoodsReceipt);

export default router;
