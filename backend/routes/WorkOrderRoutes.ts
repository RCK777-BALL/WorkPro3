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
  requireRoles(['admin', 'supervisor', 'tech']),
  assistWorkOrder
);
router.get('/:id', validateObjectId('id'), getWorkOrderById);

router.post(
  '/',
  requireRoles(['admin', 'supervisor', 'tech']),
  upload.any(),
  workOrderValidators,
  validate,
  createWorkOrder
);
 
router.put(
  '/:id',
  validateObjectId('id'),
  requireRoles(['admin', 'supervisor', 'tech']),
  workOrderValidators,
  validate,
  updateWorkOrder
);
 
router.post(
  '/:id/approve',
  validateObjectId('id'),
  requireRoles(['admin', 'supervisor']),
  approveWorkOrder
);
router.delete('/:id', validateObjectId('id'), requireRoles(['admin', 'supervisor']), deleteWorkOrder);
 
export default router;
