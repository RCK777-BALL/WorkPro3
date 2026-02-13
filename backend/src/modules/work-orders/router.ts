/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth, requireRole } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';
import { enforceSafetyControls } from './middleware';
import {
  acknowledgeSlaHandler,
  advanceApprovalHandler,
  createTemplateHandler,
  deleteTemplateHandler,
  getTemplateHandler,
  listTemplatesHandler,
  reconcileOfflineUpdateHandler,
  requestApprovalHandler,
  updateStatusHandler,
  updateTemplateHandler,
  workOrderParamValidator,
} from './controller';

const router = Router();

const APPROVAL_ROLES = [
  'global_admin',
  'plant_admin',
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'assistant_department_leader',
  'workorder_supervisor',
  'site_supervisor',
  'department_leader',
  'manager',
  'supervisor',
  'planner',
] as const;

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('work_orders', { entityIdParams: ['workOrderId', 'templateId'] }));

router.patch(
  '/:workOrderId/status',
  requirePermission('workorders.write'),
  workOrderParamValidator,
  enforceSafetyControls,
  updateStatusHandler,
);
router.put(
  '/:workOrderId/reconcile',
  requirePermission('workorders.write'),
  workOrderParamValidator,
  enforceSafetyControls,
  reconcileOfflineUpdateHandler,
);
router.post(
  '/:workOrderId/approvals/advance',
  requirePermission('workorders.approve'),
  requireRole(...APPROVAL_ROLES),
  workOrderParamValidator,
  advanceApprovalHandler,
);
router.post(
  '/:workOrderId/approvals/request',
  requirePermission('workorders.write'),
  requireRole(...APPROVAL_ROLES),
  workOrderParamValidator,
  requestApprovalHandler,
);
router.post(
  '/:workOrderId/sla',
  requirePermission('workorders.write'),
  workOrderParamValidator,
  acknowledgeSlaHandler,
);

router.post('/templates', requirePermission('workorders.write'), createTemplateHandler);
router.get('/templates', requirePermission('workorders.read'), listTemplatesHandler);
router.get('/templates/:templateId', requirePermission('workorders.read'), getTemplateHandler);
router.put('/templates/:templateId', requirePermission('workorders.write'), updateTemplateHandler);
router.delete('/templates/:templateId', requirePermission('workorders.write'), deleteTemplateHandler);

export default router;
