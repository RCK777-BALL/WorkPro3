/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';

import { requireAuth, requireRole } from '../middleware/authMiddleware';
import type { UserRole } from '../types/auth';
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

const router = express.Router();

const READ_ROLES: UserRole[] = ['admin', 'supervisor', 'planner', 'manager', 'tech', 'technician', 'viewer'];
const PERMIT_ROLES: UserRole[] = ['admin', 'supervisor', 'manager', 'tech', 'technician', 'viewer'];
const IMPORT_ROLES: UserRole[] = ['admin', 'supervisor'];
const PLANNER_ROLES: UserRole[] = ['admin', 'supervisor', 'planner', 'manager', 'tech', 'technician'];

router.use(requireAuth);

router.get('/overview', getDashboardOverview);
router.get('/live-pulse', getDashboardLivePulse);
router.get('/workorders', requireRole(...READ_ROLES), getDashboardWorkOrders);
router.get('/recent-activity', requireRole(...READ_ROLES), getDashboardRecentActivity);
router.get('/permits', requireRole(...PERMIT_ROLES), getDashboardPermits);
router.get('/export.pdf', requireRole(...READ_ROLES), getDashboardExportPdf);
router.post('/imports/sync', requireRole(...IMPORT_ROLES), postDashboardImportSync);
router.post('/command-center/launch', requireRole(...PLANNER_ROLES), postLaunchPlanner);

export default router;
