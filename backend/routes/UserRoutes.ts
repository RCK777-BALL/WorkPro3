/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserTheme,
  updateUserTheme,
} from '../controllers/UserController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();

router.use(requireAuth);
 
router.get('/:id/theme', validateObjectId('id'), getUserTheme);
router.put('/:id/theme', validateObjectId('id'), updateUserTheme);
router.use(requireRoles(['general_manager', 'admin']));
 
router.get('/', getAllUsers);
router.get('/:id', validateObjectId('id'), getUserById);
router.post('/', createUser);
router.put('/:id', validateObjectId('id'), updateUser);
router.delete('/:id', validateObjectId('id'), deleteUser);

export default router;
