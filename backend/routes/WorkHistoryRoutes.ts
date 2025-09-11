/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllWorkHistories,
  getWorkHistoryById,
  createWorkHistory,
  updateWorkHistory,
  deleteWorkHistory
} from '../controllers/WorkHistoryController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllWorkHistories);
router.get('/:id', getWorkHistoryById);
router.post('/', createWorkHistory);
router.put('/:id', updateWorkHistory);
router.delete('/:id', deleteWorkHistory);

export default router;
