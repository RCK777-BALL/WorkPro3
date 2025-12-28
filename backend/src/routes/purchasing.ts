/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import purchasingRouter from '../modules/purchasing';

const router = Router();

router.use('/', purchasingRouter);

export default router;
