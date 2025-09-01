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
import requireRole from '../middleware/requireRole';
import authorize from '../middleware/authorize';
import { validate } from '../middleware/validationMiddleware';
import { workOrderValidators } from '../validators/workOrderValidators';

const router = express.Router();
const upload = multer();

router.use(requireAuth);
router.get('/', getAllWorkOrders);
router.get('/search', searchWorkOrders);
router.get('/:id/assist', requireRole('admin', 'manager', 'technician'), assistWorkOrder);
router.get('/:id', getWorkOrderById);

router.post(
  '/',
  requireRole('admin', 'manager', 'technician'),
  upload.any(),
  workOrderValidators,
  validate,
  createWorkOrder
);
 
router.put(
  '/:id',
  requireRole('admin', 'manager', 'technician'),
  workOrderValidators,
  validate,
  updateWorkOrder
);
 
router.post(
  '/:id/approve',
  requireRole('admin', 'manager'),
  authorize('workorders:approve'),
  approveWorkOrder
);
router.delete('/:id', requireRole('admin', 'manager'), deleteWorkOrder);
 
export default router;
