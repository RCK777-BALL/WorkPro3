/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import tenantScope from '../../middleware/tenantScope';
import { requirePermission } from '../auth/permissions';
import { syncActionsHandler } from '../controllers/sync.controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.post('/actions', requirePermission('workorders.write'), syncActionsHandler);

export default router;
