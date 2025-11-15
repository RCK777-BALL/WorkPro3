/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { dismissOnboardingReminderHandler, getOnboardingStateHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getOnboardingStateHandler);
router.post('/reminder/dismiss', dismissOnboardingReminderHandler);

export default router;
