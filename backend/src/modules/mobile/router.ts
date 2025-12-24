/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { pullDeltas, pushActions } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.post('/pull', requirePermission('workorders.read'), pullDeltas);
router.post('/push', requirePermission('workorders.write'), pushActions);

export default router;
