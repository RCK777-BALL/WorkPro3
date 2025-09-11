/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { getTeamMembers } from '../controllers/TeamMemberController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Ensure the request is authenticated and tenant is resolved
router.use(requireAuth);

router.get('/', getTeamMembers);

export default router;
