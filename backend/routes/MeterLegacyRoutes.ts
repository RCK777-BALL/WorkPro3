/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  addMeterReading,
  createMeter,
  deleteMeter,
  getMeterById,
  getMeterReadings,
  getMeters,
  updateMeter,
} from '../controllers/MeterController';
import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';

const router = Router();

router.use(requireAuth);

router.get('/', getMeters);
router.post('/', createMeter);
router.get('/:id', validateObjectId('id'), getMeterById);
router.put('/:id', validateObjectId('id'), updateMeter);
router.delete('/:id', validateObjectId('id'), deleteMeter);
router.post('/:id/readings', validateObjectId('id'), addMeterReading);
router.get('/:id/readings', validateObjectId('id'), getMeterReadings);

export default router;
