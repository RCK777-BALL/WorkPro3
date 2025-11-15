/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import {
  getExecutiveTrendsHandler,
  renderExecutiveReportHandler,
  getExecutiveScheduleHandler,
  updateExecutiveScheduleHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/trends', requirePermission('executive', 'read'), getExecutiveTrendsHandler);
router.post('/reports/pdf', requirePermission('executive', 'read'), renderExecutiveReportHandler);
router.get('/schedule', requirePermission('executive', 'read'), getExecutiveScheduleHandler);
router.put('/schedule', requirePermission('executive', 'manage'), updateExecutiveScheduleHandler);

export default router;
