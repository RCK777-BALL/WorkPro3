/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { dismissOnboardingReminderHandler, getOnboardingStateHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('sites.read'), getOnboardingStateHandler);
router.post('/reminder/dismiss', requirePermission('sites.manage'), dismissOnboardingReminderHandler);

export default router;
