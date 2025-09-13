/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import {
  getSummary,
  getSummaryTrends,
  getAssetSummary,
  getWorkOrderSummary,
  getUpcomingMaintenance,
  getCriticalAlerts,
} from '../controllers/SummaryController';

const router = express.Router();

// GET /api/summary
router.get('/', requireAuth, getSummary);
router.get('/trends', requireAuth, getSummaryTrends);
router.get('/assets', requireAuth, getAssetSummary);
router.get('/workorders', requireAuth, getWorkOrderSummary);
router.get('/upcoming-maintenance', requireAuth, getUpcomingMaintenance);
router.get('/critical-alerts', requireAuth, getCriticalAlerts);

export default router;

