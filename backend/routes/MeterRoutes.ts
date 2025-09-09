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
import requireRole from '../middleware/requireRole';
import siteScope from '../middleware/siteScope';

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

router.get('/', getMeters);
router.get('/:id', getMeterById);
router.post('/', requireRole('admin', 'manager'), createMeter);
router.put('/:id', requireRole('admin', 'manager'), updateMeter);
router.delete('/:id', requireRole('admin', 'manager'), deleteMeter);
router.get('/:id/readings', getMeterReadings);
router.post('/:id/readings', requireRole('admin', 'manager'), addMeterReading);

export default router;
