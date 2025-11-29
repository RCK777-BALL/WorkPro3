/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requirePermission } from '../src/auth/permissions';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/RoleController';

const router = express.Router();

router.use(requireAuth);

router.get('/', requirePermission('roles.read'), getAllRoles);
router.get('/:id', requirePermission('roles.read'), getRoleById);
router.post('/', requirePermission('roles.manage'), createRole);
router.put('/:id', requirePermission('roles.manage'), updateRole);
router.delete('/:id', requirePermission('roles.manage'), deleteRole);

export default router;
