/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';
import {
  exportSnapshotCsvHandler,
  getSnapshotHandler,
  getLeaderboardHandler,
  getComparisonHandler,
  rebuildSnapshotHandler,
  previewOnDemandHandler,
} from './controller';
import { backlogMetricsHandler, pmComplianceHandler, reliabilityMetricsHandler } from './metricsController';
import {
  metricsRollupCsv,
  metricsRollupDetailsJson,
  metricsRollupJson,
  metricsRollupPdf,
} from './rollupController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('analytics'));

router.get('/metrics', requirePermission('reports.read'), getSnapshotHandler);
router.get('/metrics.csv', requirePermission('reports.export'), exportSnapshotCsvHandler);
router.get('/metrics/preview', requirePermission('reports.read'), previewOnDemandHandler);
router.post('/metrics/rebuild', requirePermission('reports.build'), rebuildSnapshotHandler);
router.get('/metrics/leaderboard', requirePermission('reports.read'), getLeaderboardHandler);
router.get('/metrics/comparisons', requirePermission('reports.read'), getComparisonHandler);
router.get('/metrics/rollups', requirePermission('reports.read'), metricsRollupJson);
router.get('/metrics/rollups.csv', requirePermission('reports.export'), metricsRollupCsv);
router.get('/metrics/rollups.pdf', requirePermission('reports.export'), metricsRollupPdf);
router.get('/metrics/rollups/details', requirePermission('reports.read'), metricsRollupDetailsJson);
router.get('/metrics/reliability', requirePermission('reports.read'), reliabilityMetricsHandler);
router.get('/metrics/backlog', requirePermission('reports.read'), backlogMetricsHandler);
router.get('/metrics/pm-compliance', requirePermission('reports.read'), pmComplianceHandler);

export default router;
