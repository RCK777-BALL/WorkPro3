/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { requirePermission } from '../src/auth/permissions';
import { createFeatureFlag, listFeatureFlags, updateFeatureFlag } from '../controllers/FeatureFlagController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('roles.manage'), listFeatureFlags);
router.post('/', requirePermission('roles.manage'), createFeatureFlag);
router.put('/:id', requirePermission('roles.manage'), updateFeatureFlag);

export default router;
