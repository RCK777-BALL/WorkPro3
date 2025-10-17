/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  downloadReport,
  exportTrendData,
  getAnalyticsReport,
  getCostByAsset,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getTrendData,
} from '../controllers/ReportsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/analytics', getAnalyticsReport);
router.get('/analytics/download', downloadReport);
router.get('/trends', getTrendData);
router.get('/trends/export', exportTrendData);
router.get('/costs', getCostMetrics);
router.get('/costs/by-asset', getCostByAsset);
router.get('/downtime', getDowntimeReport);
router.get('/pm-compliance', getPmCompliance);

export default router;
