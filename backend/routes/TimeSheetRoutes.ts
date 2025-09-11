/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllTimeSheets,
  getTimeSheetById,
  createTimeSheet,
  updateTimeSheet,
  deleteTimeSheet
} from '../controllers/TimeSheetController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllTimeSheets);
router.get('/:id', getTimeSheetById);
router.post('/', createTimeSheet);
router.put('/:id', updateTimeSheet);
router.delete('/:id', deleteTimeSheet);

export default router;
