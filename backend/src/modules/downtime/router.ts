/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { createDowntimeHandler, listDowntimeHandler, updateDowntimeHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', listDowntimeHandler);
router.post('/', createDowntimeHandler);
router.put('/:id', updateDowntimeHandler);

export default router;
