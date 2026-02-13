/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import summaryRouter from './summary';

const router = Router();

router.use('/', summaryRouter);

export default router;
