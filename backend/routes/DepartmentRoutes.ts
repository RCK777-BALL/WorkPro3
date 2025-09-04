import { Router } from 'express';
import { listDepartments } from '../controllers/DepartmentController';

const router = Router();
router.get('/', listDepartments);

export default router;
