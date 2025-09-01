import express from 'express';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/TeamMemberController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);

router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;
