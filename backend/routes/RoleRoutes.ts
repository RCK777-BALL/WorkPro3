/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/RoleController';

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles(['admin']));

router.get('/', getAllRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
