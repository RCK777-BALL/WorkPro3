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
import {
  backlogAgingCsvHandler,
  backlogAgingHandler,
  backlogAgingPdfHandler,
  backlogMetricsHandler,
  mttrMtbfTrendCsvHandler,
  mttrMtbfTrendHandler,
  mttrMtbfTrendPdfHandler,
  pmComplianceHandler,
  reliabilityMetricsHandler,
  slaPerformanceCsvHandler,
  slaPerformanceHandler,
  slaPerformancePdfHandler,
  downtimeCostHandler,
  technicianUtilizationCsvHandler,
  technicianUtilizationHandler,
  technicianUtilizationPdfHandler,
} from './metricsController';
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
router.get('/metrics/mttr-mtbf', requirePermission('reports.read'), mttrMtbfTrendHandler);
router.get('/metrics/mttr-mtbf.csv', requirePermission('reports.export'), mttrMtbfTrendCsvHandler);
router.get('/metrics/mttr-mtbf.pdf', requirePermission('reports.export'), mttrMtbfTrendPdfHandler);
router.get('/metrics/backlog-aging', requirePermission('reports.read'), backlogAgingHandler);
router.get('/metrics/backlog-aging.csv', requirePermission('reports.export'), backlogAgingCsvHandler);
router.get('/metrics/backlog-aging.pdf', requirePermission('reports.export'), backlogAgingPdfHandler);
router.get('/metrics/sla-performance', requirePermission('reports.read'), slaPerformanceHandler);
router.get('/metrics/sla-performance.csv', requirePermission('reports.export'), slaPerformanceCsvHandler);
router.get('/metrics/sla-performance.pdf', requirePermission('reports.export'), slaPerformancePdfHandler);
router.get('/metrics/technician-utilization', requirePermission('reports.read'), technicianUtilizationHandler);
router.get('/metrics/technician-utilization.csv', requirePermission('reports.export'), technicianUtilizationCsvHandler);
router.get('/metrics/technician-utilization.pdf', requirePermission('reports.export'), technicianUtilizationPdfHandler);
router.get('/metrics/downtime-cost', requirePermission('reports.read'), downtimeCostHandler);

export default router;
