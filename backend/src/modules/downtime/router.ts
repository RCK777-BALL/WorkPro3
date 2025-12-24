/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { createDowntimeHandler, listDowntimeHandler, updateDowntimeHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('workorders.read'), listDowntimeHandler);
router.post('/', requirePermission('workorders.write'), createDowntimeHandler);
router.put('/:id', requirePermission('workorders.write'), updateDowntimeHandler);

export default router;
