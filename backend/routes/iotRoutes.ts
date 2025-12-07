/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  ingestTelemetry,
  getSignals,
  ingestSensorWithMetering,
  listSensorDevices,
  upsertSensorDevice,
} from '../controllers/IotController';
import { apiAccessMiddleware } from '../middleware/apiAccess';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(apiAccessMiddleware);

router.post('/ingest', ingestTelemetry);
router.post('/sensors/ingest', ingestSensorWithMetering);
router.get('/signals', getSignals);
router.get('/devices', requireAuth, listSensorDevices);
router.post('/devices', requireAuth, upsertSensorDevice);
router.put('/devices/:id', requireAuth, upsertSensorDevice);

export default router;
