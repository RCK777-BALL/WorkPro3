import express from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} from '../controllers/TenantController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', getAllTenants);
router.get('/:id', getTenantById);
router.post('/', createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

export default router;
