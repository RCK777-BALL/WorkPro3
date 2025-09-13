/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getPmCompliance,
  getCostByAsset,
  getDowntimeReport,
} from '../controllers/ReportsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
// Optional query param ?role=ROLE filters user-based analytics metrics
router.get('/analytics', getAnalyticsReport);
// Supports ?format=csv|pdf and ?role=ROLE
router.get('/download', downloadReport);
router.get('/trends', getTrendData);
router.get('/trends/export', exportTrendData);
router.get('/pm-compliance', getPmCompliance);
router.get('/downtime', getDowntimeReport);
router.get('/cost-by-asset', getCostByAsset);

export default router;
