/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
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
  exportWorkOrderCompliancePacket,
  assignWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  assistWorkOrder,
  updateWorkOrderChecklist,
  bulkUpdateWorkOrders,
  getDispatchTechnicians,
  getDispatchCapacity,
  validateDispatchAssignment,
  updateWorkOrderSchedule,
  bulkDispatchUpdate,
} from '../controllers/WorkOrderController';
import {
  deleteWorkOrderPartLineItem,
  issueWorkOrderPart,
  listWorkOrderParts,
  reserveWorkOrderPart,
  returnIssuedWorkOrderPart,
  unreserveWorkOrderPart,
} from '../controllers/WorkOrderPartsController';

const router = Router();
const workOrderValidationHandlers = workOrderValidators as unknown as RequestHandler[];

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

router.get('/', requirePermission('workorders.read'), getAllWorkOrders);
router.get('/search', requirePermission('workorders.read'), searchWorkOrders);
router.get('/dispatch/technicians', requirePermission('workorders.read'), getDispatchTechnicians);
router.get('/dispatch/capacity', requirePermission('workorders.read'), getDispatchCapacity);
router.post('/dispatch/validate-assignment', requirePermission('workorders.read'), validateDispatchAssignment);
router.post('/dispatch/bulk-update', requirePermission('workorders.write'), bulkDispatchUpdate);

/** Bulk updates should come before "/:id" to avoid route collision */
router.patch('/bulk', requirePermission('workorders.write'), bulkUpdateWorkOrders);
router.patch('/:id/schedule', validateObjectId('id'), requirePermission('workorders.write'), updateWorkOrderSchedule);

router.get('/:id', validateObjectId('id'), requirePermission('workorders.read'), getWorkOrderById);
router.post(
  '/',
  requirePermission('workorders.write'),
  ...workOrderValidationHandlers,
  validate,
  createWorkOrder,
);
router.put('/:id', validateObjectId('id'), requirePermission('workorders.write'), updateWorkOrder);
router.delete('/:id', validateObjectId('id'), requirePermission('workorders.write'), deleteWorkOrder);

router.post(
  '/:id/approve',
  validateObjectId('id'),
  requirePermission('workorders.approve'),
  requireRole(...APPROVAL_ROLES),
  approveWorkOrder,
);
router.get(
  '/:id/compliance-packet',
  validateObjectId('id'),
  requirePermission('workorders.read'),
  exportWorkOrderCompliancePacket,
);

router.post('/:id/assign', validateObjectId('id'), requirePermission('workorders.write'), assignWorkOrder);
router.post('/:id/start', validateObjectId('id'), requirePermission('workorders.write'), startWorkOrder);
router.post('/:id/complete', validateObjectId('id'), requirePermission('workorders.write'), completeWorkOrder);
router.post('/:id/cancel', validateObjectId('id'), requirePermission('workorders.write'), cancelWorkOrder);

router.put('/:id/checklist', validateObjectId('id'), requirePermission('workorders.write'), updateWorkOrderChecklist);

router.get('/:id/assist', validateObjectId('id'), requirePermission('workorders.read'), assistWorkOrder);

router.get('/:id/parts', validateObjectId('id'), requirePermission('workorders.read'), listWorkOrderParts);
router.post('/:id/parts/reserve', validateObjectId('id'), requirePermission('workorders.write'), reserveWorkOrderPart);
router.post(
  '/:id/parts/unreserve',
  validateObjectId('id'),
  requirePermission('workorders.write'),
  unreserveWorkOrderPart,
);
router.post('/:id/parts/issue', validateObjectId('id'), requirePermission('workorders.write'), issueWorkOrderPart);
router.post('/:id/parts/return', validateObjectId('id'), requirePermission('workorders.write'), returnIssuedWorkOrderPart);

router.delete(
  '/:id/parts/:lineItemId',
  validateObjectId('id'),
  validateObjectId('lineItemId'),
  requirePermission('workorders.write'),
  deleteWorkOrderPartLineItem,
);

export default router;
