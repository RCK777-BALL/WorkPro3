/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { listTemplatesHandler, upsertAssignmentHandler, deleteAssignmentHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('pm', 'read'), listTemplatesHandler);
router.post(
  '/:templateId/assignments',
  requirePermission('pm', 'write'),
  upsertAssignmentHandler,
);
router.put(
  '/:templateId/assignments/:assignmentId',
  requirePermission('pm', 'write'),
  upsertAssignmentHandler,
);
router.delete(
  '/:templateId/assignments/:assignmentId',
  requirePermission('pm', 'delete'),
  deleteAssignmentHandler,
);

export default router;
