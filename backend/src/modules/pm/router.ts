/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';
import {
  listTemplatesHandler,
  createTemplateHandler,
  getTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  upsertAssignmentHandler,
  deleteAssignmentHandler,
} from './controller';
import {
  listCategoriesHandler,
  createCategoryHandler,
  listProcedureTemplatesHandler,
  createProcedureTemplateHandler,
  getProcedureTemplateHandler,
  updateProcedureTemplateHandler,
  deleteProcedureTemplateHandler,
  listVersionsHandler,
  createVersionHandler,
  getVersionHandler,
  updateVersionHandler,
  deleteVersionHandler,
  publishVersionHandler,
} from './procedureController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('pm', { entityIdParams: ['templateId', 'assignmentId', 'versionId'] }));

router.get('/', requirePermission('pm', 'read'), listTemplatesHandler);
router.post('/', requirePermission('pm', 'write'), createTemplateHandler);
router.get('/:templateId', requirePermission('pm', 'read'), getTemplateHandler);
router.put('/:templateId', requirePermission('pm', 'write'), updateTemplateHandler);
router.delete('/:templateId', requirePermission('pm', 'delete'), deleteTemplateHandler);
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

router.get('/categories', requirePermission('pm', 'read'), listCategoriesHandler);
router.post('/categories', requirePermission('pm', 'write'), createCategoryHandler);

router.get('/procedures', requirePermission('pm', 'read'), listProcedureTemplatesHandler);
router.post('/procedures', requirePermission('pm', 'write'), createProcedureTemplateHandler);
router.get('/procedures/:templateId', requirePermission('pm', 'read'), getProcedureTemplateHandler);
router.put('/procedures/:templateId', requirePermission('pm', 'write'), updateProcedureTemplateHandler);
router.delete('/procedures/:templateId', requirePermission('pm', 'delete'), deleteProcedureTemplateHandler);

router.get('/procedures/:templateId/versions', requirePermission('pm', 'read'), listVersionsHandler);
router.post('/procedures/:templateId/versions', requirePermission('pm', 'write'), createVersionHandler);
router.get('/versions/:versionId', requirePermission('pm', 'read'), getVersionHandler);
router.put('/versions/:versionId', requirePermission('pm', 'write'), updateVersionHandler);
router.delete('/versions/:versionId', requirePermission('pm', 'delete'), deleteVersionHandler);
router.post('/versions/:versionId/publish', requirePermission('pm', 'write'), publishVersionHandler);

export default router;
