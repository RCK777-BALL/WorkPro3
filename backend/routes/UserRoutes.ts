import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserTheme,
  updateUserTheme
} from '../controllers/UserController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRole from '../middleware/requireRole';

const router = express.Router();

router.use(requireAuth);
 
router.get('/:id/theme', getUserTheme);
router.put('/:id/theme', updateUserTheme);
router.use(requireRole('admin'));
 
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
