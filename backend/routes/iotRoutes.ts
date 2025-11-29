/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { ingestTelemetry, getSignals, ingestSensorWithMetering } from '../controllers/IotController';
import { apiAccessMiddleware } from '../middleware/apiAccess';

const router = express.Router();

router.use(apiAccessMiddleware);

router.post('/ingest', ingestTelemetry);
router.post('/sensors/ingest', ingestSensorWithMetering);
router.get('/signals', getSignals);

export default router;
