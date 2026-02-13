/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/TeamMemberController';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import requireRoles from '../middleware/requireRoles';

const router = express.Router();

// Ensure the request is authenticated and tenant is resolved
router.use(requireAuth);
router.use(tenantScope);

router.get('/', getTeamMembers);
router.post(
  '/',
  requireRoles([
    'general_manager',
    'assistant_general_manager',
    'operations_manager',
    'admin',
    'manager',
  ]),
  createTeamMember,
);
router.put(
  '/:id',
  requireRoles([
    'general_manager',
    'assistant_general_manager',
    'operations_manager',
    'admin',
    'manager',
  ]),
  updateTeamMember,
);
router.delete(
  '/:id',
  requireRoles([
    'general_manager',
    'assistant_general_manager',
    'operations_manager',
    'admin',
    'manager',
  ]),
  deleteTeamMember,
);

export default router;
