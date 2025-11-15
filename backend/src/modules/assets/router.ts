/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { getAssetDetailsHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/:assetId/details', requirePermission('hierarchy', 'read'), getAssetDetailsHandler);

export default router;
