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
import { pmTaskValidators } from '../validators/pmTaskValidators';

const router = express.Router();

router.use(requireAuth);
router.use(tenantScope);
router.get('/', getAllPMTasks);
router.get('/:id', getPMTaskById);
router.post('/', pmTaskValidators, validate, createPMTask);
router.put('/:id', pmTaskValidators, validate, updatePMTask);
router.delete('/:id', deletePMTask);
router.post('/generate', generatePMWorkOrders);

export default router;
