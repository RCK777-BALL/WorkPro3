/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import tenantScope from '../../middleware/tenantScope';
import { requirePermission } from '../auth/permissions';
import {
  listWorkOrdersHandler,
  getWorkOrderHandler,
  createWorkOrderHandler,
  updateWorkOrderHandler,
  deleteWorkOrderHandler,
} from '../controllers/workorders.controller';
import {
  validateWorkOrderCreate,
  validateWorkOrderQuery,
  validateWorkOrderUpdate,
} from '../validators/workorders.validators';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('workorders.read'), validateWorkOrderQuery, listWorkOrdersHandler);
router.get('/:workOrderId', requirePermission('workorders.read'), getWorkOrderHandler);
router.post('/', requirePermission('workorders.write'), validateWorkOrderCreate, createWorkOrderHandler);
router.put('/:workOrderId', requirePermission('workorders.write'), validateWorkOrderUpdate, updateWorkOrderHandler);
router.delete('/:workOrderId', requirePermission('workorders.write'), deleteWorkOrderHandler);

export default router;
