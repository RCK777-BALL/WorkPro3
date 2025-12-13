/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { pullDeltas, pushActions } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.post('/pull', pullDeltas);
router.post('/push', pushActions);

export default router;
