/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import {
  getSnapshotHandler,
  getLeaderboardHandler,
  getComparisonHandler,
  rebuildSnapshotHandler,
  previewOnDemandHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/metrics', getSnapshotHandler);
router.get('/metrics/preview', previewOnDemandHandler);
router.post('/metrics/rebuild', rebuildSnapshotHandler);
router.get('/metrics/leaderboard', getLeaderboardHandler);
router.get('/metrics/comparisons', getComparisonHandler);

export default router;
