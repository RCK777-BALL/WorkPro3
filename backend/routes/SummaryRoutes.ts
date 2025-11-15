/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  getSummary,
  getSummaryTrends,
  getAssetSummary,
  getWorkOrderSummary,
  getUpcomingMaintenance,
  getCriticalAlerts,
} from '../controllers/SummaryController';

const router = express.Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getSummary);
router.get('/trends', getSummaryTrends);
router.get('/assets', getAssetSummary);
router.get('/workorders', getWorkOrderSummary);
router.get('/upcoming-maintenance', getUpcomingMaintenance);
router.get('/critical-alerts', getCriticalAlerts);

export default router;

