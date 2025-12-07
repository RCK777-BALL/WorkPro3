/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllPMTasks,
  getPMTaskById,
  createPMTask,
  updatePMTask,
  deletePMTask,
  generatePMWorkOrders,
} from '../controllers/PMTaskController';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { validate } from '../middleware/validationMiddleware';
import { requirePermission } from '../src/auth/permissions';
import { pmTaskValidators } from '../validators/pmTaskValidators';

const router = express.Router();

router.use(requireAuth);
router.use(tenantScope);
router.get('/', requirePermission('pm.read'), getAllPMTasks);
router.get('/:id', requirePermission('pm.read'), getPMTaskById);
router.post('/', requirePermission('pm.write'), pmTaskValidators, validate, createPMTask);
router.put('/:id', requirePermission('pm.write'), pmTaskValidators, validate, updatePMTask);
router.delete('/:id', requirePermission('pm.delete'), deletePMTask);
router.post('/generate', requirePermission('pm.write'), generatePMWorkOrders);

export default router;
