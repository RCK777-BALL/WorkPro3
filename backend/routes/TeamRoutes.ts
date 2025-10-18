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
import requireRoles from '../middleware/requireRoles';

const router = express.Router();

// Ensure the request is authenticated and tenant is resolved
router.use(requireAuth);

router.get('/', getTeamMembers);
router.post('/', requireRoles(['admin', 'manager']), createTeamMember);
router.put('/:id', requireRoles(['admin', 'manager']), updateTeamMember);
router.delete('/:id', requireRoles(['admin', 'manager']), deleteTeamMember);

export default router;
