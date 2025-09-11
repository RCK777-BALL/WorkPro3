/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  getStationsByLine,
} from './DepartmentRoutes';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllStations);
router.get('/line/:lineId', getStationsByLine);
router.get('/:id', getStationById);
router.post('/', createStation);
router.put('/:id', updateStation);
router.delete('/:id', deleteStation);

export default router;
