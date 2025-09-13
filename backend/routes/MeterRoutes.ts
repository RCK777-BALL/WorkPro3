/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getMeters,
  getMeterById,
  createMeter,
  updateMeter,
  deleteMeter,
  addMeterReading,
  getMeterReadings,
} from '../controllers/MeterController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import siteScope from '../middleware/siteScope';

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

router.get('/', getMeters);
router.get('/:id', getMeterById);
router.post('/', requireRoles(['admin', 'supervisor']), createMeter);
router.put('/:id', requireRoles(['admin', 'supervisor']), updateMeter);
router.delete('/:id', requireRoles(['admin', 'supervisor']), deleteMeter);
router.get('/:id/readings', getMeterReadings);
router.post('/:id/readings', requireRoles(['admin', 'supervisor']), addMeterReading);

export default router;
