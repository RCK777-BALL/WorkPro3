/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import tenantScope from '../../middleware/tenantScope';
import { requirePermission } from '../auth/permissions';
import {
  listPmHandler,
  getPmHandler,
  createPmHandler,
  updatePmHandler,
  deletePmHandler,
} from '../controllers/pm.controller';
import { validatePmCreate, validatePmUpdate } from '../validators/pm.validators';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('pm.read'), listPmHandler);
router.get('/:pmId', requirePermission('pm.read'), getPmHandler);
router.post('/', requirePermission('pm.write'), validatePmCreate, createPmHandler);
router.put('/:pmId', requirePermission('pm.write'), validatePmUpdate, updatePmHandler);
router.delete('/:pmId', requirePermission('pm.delete'), deletePmHandler);

export default router;
