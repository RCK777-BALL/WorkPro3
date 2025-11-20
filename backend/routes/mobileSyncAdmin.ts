/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth, requireScopes } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import {
  listPendingQueues,
  listConflictSummaries,
  resolveConflict,
  listDeviceTelemetry,
  recordConflictFromClient,
} from '../controllers/MobileSyncAdminController';

const router = Router();

router.use(requireAuth);
router.use(requireScopes('mobile:access'));
router.use(requireRoles(['admin', 'general_manager', 'assistant_general_manager']));

router.get('/admin/sync/pending', listPendingQueues);
router.get('/admin/sync/conflicts', listConflictSummaries);
router.post('/admin/sync/conflicts/:id/resolve', resolveConflict);
router.get('/admin/sync/telemetry', listDeviceTelemetry);
router.post('/admin/sync/conflicts', recordConflictFromClient);

export default router;
