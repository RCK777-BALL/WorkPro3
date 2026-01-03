/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Alert from '../models/Alert';
import type { AuthedRequest } from '../types/http';

const MAX_LIMIT = 200;

const resolveLimit = (raw?: string | string[]) => {
  if (Array.isArray(raw)) return resolveLimit(raw[0]);
  const parsed = raw ? Number(raw) : 20;
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
};

const router = Router();
router.use(requireAuth);

const listAlertsHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    const plantId = authedReq.plantId ?? authedReq.siteId;
    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = tenantId;
    if (plantId) filter.plant = plantId;
    if (typeof authedReq.query.type === 'string' && authedReq.query.type !== 'all') {
      filter.type = authedReq.query.type;
    }
    const limit = resolveLimit(authedReq.query.limit as string | undefined);
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('asset', 'name')
      .lean();
    res.json(
      alerts.map((alert) => {
        const assetField = alert.asset as
          | { _id: { toString: () => string }; name?: string }
          | string
          | undefined;
        const assetId =
          assetField && typeof assetField === 'object' && '_id' in assetField
            ? (assetField as any)._id.toString()
            : typeof assetField === 'string'
              ? assetField
              : undefined;
        const assetName =
          assetField && typeof assetField === 'object' && 'name' in assetField
            ? (assetField as { name?: string }).name
            : undefined;
        return {
          ...alert,
          _id: alert._id.toString(),
          plant: alert.plant?.toString?.() ?? alert.plant,
          asset: assetId,
          assetName,
        };
      }),
    );
  } catch (err) {
    next(err);
  }
};

router.get('/', listAlertsHandler);

export default router;
