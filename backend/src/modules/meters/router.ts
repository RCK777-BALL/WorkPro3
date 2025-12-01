/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { createMeterReadingHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.post('/readings', requirePermission('hierarchy', 'write'), createMeterReadingHandler);

export default router;
