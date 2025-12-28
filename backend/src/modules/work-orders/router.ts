/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
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
  updateStatusHandler,
  updateTemplateHandler,
  workOrderParamValidator,
} from './controller';

const router = Router();

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
router.post(
  '/:workOrderId/approvals/advance',
  requirePermission('workorders.approve'),
  workOrderParamValidator,
  advanceApprovalHandler,
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
