/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  getDashboardOverview,
  getDashboardLivePulse,
  getDashboardWorkOrders,
  getDashboardRecentActivity,
  getDashboardPermits,
  getDashboardExportPdf,
  postDashboardImportSync,
  postLaunchPlanner,
} from '../controllers/DashboardController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/overview', getDashboardOverview);
router.get('/live-pulse', getDashboardLivePulse);
router.get('/work-orders', getDashboardWorkOrders);
router.get('/activity', getDashboardRecentActivity);
router.get('/permits', getDashboardPermits);
router.get('/export/pdf', getDashboardExportPdf);
router.post('/import/sync', postDashboardImportSync);
router.post('/launch-planner', postLaunchPlanner);

export default router;
