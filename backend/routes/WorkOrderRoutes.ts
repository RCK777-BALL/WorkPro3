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
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import { validate } from '../middleware/validationMiddleware';
import { workOrderValidators } from '../validators/workOrderValidators';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();
const upload = multer();

router.use(requireAuth);
router.get('/', getAllWorkOrders);
router.get('/search', searchWorkOrders);
router.get(
  '/:id/assist',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  assistWorkOrder
);
router.get('/:id', validateObjectId('id'), getWorkOrderById);

router.post(
  '/',
  requireRoles(['admin', 'manager', 'technician']),
  upload.any(),
  workOrderValidators,
  validate,
  createWorkOrder
);
 
router.put(
  '/:id',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  workOrderValidators,
  validate,
  updateWorkOrder
);
 
router.post(
  '/:id/approve',
  validateObjectId('id'),
  requireRoles(['admin', 'manager']),
  approveWorkOrder
);
router.post(
  '/:id/assign',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  assignWorkOrder
);
router.post(
  '/:id/start',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  startWorkOrder
);
router.post(
  '/:id/complete',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  completeWorkOrder
);
router.post(
  '/:id/cancel',
  validateObjectId('id'),
  requireRoles(['admin', 'manager', 'technician']),
  cancelWorkOrder
);
router.delete('/:id', validateObjectId('id'), requireRoles(['admin', 'manager']), deleteWorkOrder);
 
export default router;
