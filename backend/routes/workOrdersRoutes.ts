/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import { validate } from '../middleware/validationMiddleware';
import { workOrderValidators } from '../validators/workOrderValidators';
import { requirePermission } from '../src/auth/permissions';
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
  updateWorkOrderChecklist,
} from '../controllers/WorkOrderController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('workorders.read'), getAllWorkOrders);
router.get('/search', requirePermission('workorders.read'), searchWorkOrders);
router.get('/:id', validateObjectId('id'), requirePermission('workorders.read'), getWorkOrderById);
router.post('/', requirePermission('workorders.write'), workOrderValidators, validate, createWorkOrder);
router.put('/:id', validateObjectId('id'), requirePermission('workorders.write'), updateWorkOrder);
router.delete('/:id', validateObjectId('id'), requirePermission('workorders.write'), deleteWorkOrder);
router.post('/:id/approve', validateObjectId('id'), requirePermission('workorders.approve'), approveWorkOrder);
router.post('/:id/assign', validateObjectId('id'), requirePermission('workorders.write'), assignWorkOrder);
router.post('/:id/start', validateObjectId('id'), requirePermission('workorders.write'), startWorkOrder);
router.post('/:id/complete', validateObjectId('id'), requirePermission('workorders.write'), completeWorkOrder);
router.post('/:id/cancel', validateObjectId('id'), requirePermission('workorders.write'), cancelWorkOrder);
router.put('/:id/checklist', validateObjectId('id'), requirePermission('workorders.write'), updateWorkOrderChecklist);
router.get('/:id/assist', validateObjectId('id'), requirePermission('workorders.read'), assistWorkOrder);

export default router;
