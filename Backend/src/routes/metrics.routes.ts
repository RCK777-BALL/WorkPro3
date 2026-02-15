/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { metricsRegistry } from '../metrics/metrics';

const router = Router();

router.get('/', async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

export default router;
