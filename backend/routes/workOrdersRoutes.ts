/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import { validate } from '../middleware/validationMiddleware';
import { workOrderValidators } from '../validators/workOrderValidators';
import {
  getAllWorkOrders,
  searchWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  approveWorkOrder,
  assignWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  assistWorkOrder,
} from '../controllers/WorkOrderController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getAllWorkOrders);
router.get('/search', searchWorkOrders);
router.get('/:id', validateObjectId('id'), getWorkOrderById);
router.post('/', workOrderValidators, validate, createWorkOrder);
router.put('/:id', validateObjectId('id'), updateWorkOrder);
router.delete('/:id', validateObjectId('id'), deleteWorkOrder);
router.post('/:id/approve', validateObjectId('id'), approveWorkOrder);
router.post('/:id/assign', validateObjectId('id'), assignWorkOrder);
router.post('/:id/start', validateObjectId('id'), startWorkOrder);
router.post('/:id/complete', validateObjectId('id'), completeWorkOrder);
router.post('/:id/cancel', validateObjectId('id'), cancelWorkOrder);
router.get('/:id/assist', validateObjectId('id'), assistWorkOrder);

export default router;
