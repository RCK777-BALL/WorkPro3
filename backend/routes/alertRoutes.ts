/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Alert from '../models/Alert';
import type { AuthedRequest } from '../types/http';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    const plantId = req.plantId ?? req.siteId;
    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    if (plantId) filter.plant = plantId;
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(20).lean();
    res.json(
      alerts.map((alert) => ({
        ...alert,
        _id: alert._id.toString(),
        plant: alert.plant.toString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
