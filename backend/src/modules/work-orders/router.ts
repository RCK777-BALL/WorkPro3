/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
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

router.patch('/:workOrderId/status', workOrderParamValidator, enforceSafetyControls, updateStatusHandler);
router.post('/:workOrderId/approvals/advance', workOrderParamValidator, advanceApprovalHandler);
router.post('/:workOrderId/sla', workOrderParamValidator, acknowledgeSlaHandler);

router.post('/templates', createTemplateHandler);
router.get('/templates', listTemplatesHandler);
router.get('/templates/:templateId', getTemplateHandler);
router.put('/templates/:templateId', updateTemplateHandler);
router.delete('/templates/:templateId', deleteTemplateHandler);

export default router;
