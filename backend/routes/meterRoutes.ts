/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  getMeters,
  getMeterById,
  createMeter,
  updateMeter,
  deleteMeter,
  addMeterReading,
  getMeterReadings,
} from '../controllers/MeterController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getMeters);
router.get('/:id', validateObjectId('id'), getMeterById);
router.post('/', createMeter);
router.put('/:id', validateObjectId('id'), updateMeter);
router.delete('/:id', validateObjectId('id'), deleteMeter);
router.post('/:id/readings', validateObjectId('id'), addMeterReading);
router.get('/:id/readings', validateObjectId('id'), getMeterReadings);

export default router;
