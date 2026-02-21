/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
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

router.use(requireRoles(['admin']));

router.get('/', getAllUsers);
router.get('/:id', validateObjectId('id'), getUserById);
router.post('/', createUser);
router.patch('/:id', validateObjectId('id'), updateUser);
router.patch('/:id/deactivate', validateObjectId('id'), deactivateUser);

export default router;
