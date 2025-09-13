/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import multer from 'multer';
import {
  getAllWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  approveWorkOrder,
  searchWorkOrders,
  assistWorkOrder,
  assignWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
} from '../controllers/WorkOrderController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import type { UserRole } from '../types/auth';
import { validate } from '../middleware/validationMiddleware';
import { workOrderValidators } from '../validators/workOrderValidators';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();
const upload = multer();

const ADMIN_SUPERVISOR_TECH: UserRole[] = ['admin', 'supervisor', 'tech'];
const ADMIN_SUPERVISOR: UserRole[] = ['admin', 'supervisor'];
const MANAGER_OR_TECH: UserRole[] = ['manager', 'technician'];
const ADMIN_MANAGER: UserRole[] = ['admin', 'manager'];

router.use(requireAuth);
router.get('/', getAllWorkOrders);
router.get('/search', searchWorkOrders);
router.get(
  '/:id/assist',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR_TECH),
  assistWorkOrder
);
router.get('/:id', validateObjectId('id'), getWorkOrderById);

router.post(
  '/',
  requireRole(...ADMIN_SUPERVISOR_TECH),
  upload.any(),
  workOrderValidators,
  validate,
  createWorkOrder
);
 
router.put(
  '/:id',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR_TECH),
  workOrderValidators,
  validate,
  updateWorkOrder
);
 
router.post(
  '/:id/approve',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR),
  approveWorkOrder
);
router.post(
  '/:id/assign',
  validateObjectId('id'),
  requireRole(...MANAGER_OR_TECH, 'admin'),
  assignWorkOrder
);
router.post(
  '/:id/start',
  validateObjectId('id'),
  requireRole(...MANAGER_OR_TECH, 'admin'),
  startWorkOrder
);
router.post(
  '/:id/complete',
  validateObjectId('id'),
  requireRole(...MANAGER_OR_TECH, 'admin'),
  completeWorkOrder
);
router.post(
  '/:id/cancel',
  validateObjectId('id'),
  requireRole(...MANAGER_OR_TECH, 'admin'),
  cancelWorkOrder
);
router.delete(
  '/:id',
  validateObjectId('id'),
  requireRole(...ADMIN_MANAGER),
  deleteWorkOrder
);

 
export default router;
