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
  createDefinitionHandler,
  createInstanceHandler,
  createSlaPolicyHandler,
  listDefinitionsHandler,
  listInstancesHandler,
  listSlaPoliciesHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('workflows'));

router.get('/definitions', requirePermission('workorders.read'), listDefinitionsHandler);
router.post('/definitions', requirePermission('workorders.write'), createDefinitionHandler);
router.get('/instances', requirePermission('workorders.read'), listInstancesHandler);
router.post('/instances', requirePermission('workorders.write'), createInstanceHandler);
router.get('/sla-policies', requirePermission('workorders.read'), listSlaPoliciesHandler);
router.post('/sla-policies', requirePermission('workorders.write'), createSlaPolicyHandler);

export default router;
