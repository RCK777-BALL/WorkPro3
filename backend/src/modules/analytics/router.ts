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
import {
  metricsRollupCsv,
  metricsRollupDetailsJson,
  metricsRollupJson,
  metricsRollupPdf,
} from './rollupController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/metrics', getSnapshotHandler);
router.get('/metrics/preview', previewOnDemandHandler);
router.post('/metrics/rebuild', rebuildSnapshotHandler);
router.get('/metrics/leaderboard', getLeaderboardHandler);
router.get('/metrics/comparisons', getComparisonHandler);
router.get('/metrics/rollups', metricsRollupJson);
router.get('/metrics/rollups.csv', metricsRollupCsv);
router.get('/metrics/rollups.pdf', metricsRollupPdf);
router.get('/metrics/rollups/details', metricsRollupDetailsJson);

export default router;
