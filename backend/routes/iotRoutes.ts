/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { ingestTelemetry, getSignals } from '../controllers/IotController';

const router = express.Router();

router.post('/ingest', ingestTelemetry);
router.get('/signals', getSignals);

export default router;
