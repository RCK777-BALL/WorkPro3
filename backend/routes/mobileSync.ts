/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import mobileSyncRouter from '../src/modules/mobile';

const router = Router();

router.use('/sync', mobileSyncRouter);

export default router;
