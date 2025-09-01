import express from 'express';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/DepartmentController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);

router.get('/', getAllDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
