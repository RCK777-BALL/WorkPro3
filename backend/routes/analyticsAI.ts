/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Plant from '../models/Plant';
import WorkOrder from '../models/WorkOrder';
import { emitAlert } from '../socket/alertEmitter';
import { sendAlertEmail } from '../email/notifyAlert';
import User from '../models/User';
import type { AuthedRequest } from '../types/http';

const router = Router();
router.use(requireAuth);

interface TrendResult {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
}

const forecastTrend = (values: number[] = []): TrendResult => {
  if (values.length < 3) {
    return { trend: 'stable', slope: 0 };
  }
  const deltas = [] as number[];
  for (let i = 1; i < values.length; i += 1) {
    deltas.push(values[i] - values[i - 1]);
  }
  const recent = deltas.slice(-3);
  const slope = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  if (slope > 5) {
    return { trend: 'increasing', slope };
  }
  if (slope < -5) {
    return { trend: 'decreasing', slope };
  }
  return { trend: 'stable', slope };
};

router.get('/insights', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const plantFilter = { tenantId } as Record<string, unknown>;
    const plants = await Plant.find(plantFilter).lean();
    const io = req.app.get('io');

    const insights = await Promise.all(
      plants.map(async (plant) => {
        const match = { tenantId, plant: plant._id };
        const recent = await WorkOrder.find(match)
          .sort({ createdAt: -1 })
          .limit(10)
          .select('downtime wrenchTime status title')
          .lean();

        const downtimeSeries = recent.map((item) => Number(item.downtime ?? 0));
        const wrenchSeries = recent.map((item) => Number(item.wrenchTime ?? 0));

        const downtimeTrend = forecastTrend(downtimeSeries);
        const wrenchTrend = forecastTrend(wrenchSeries);

        let level: 'normal' | 'warning' | 'critical' | 'success' = 'normal';
        let message = 'Performance stable.';

        if (downtimeTrend.trend === 'increasing') {
          message = `⚠️ Rising downtime detected at ${plant.name}.`;
          level = downtimeTrend.slope > 10 ? 'critical' : 'warning';
        } else if (downtimeTrend.trend === 'decreasing') {
          message = `✅ Downtime improving at ${plant.name}.`;
          level = 'success';
        }

        if (wrenchTrend.trend === 'increasing' && level !== 'critical') {
          message = `🔧 Wrench time increasing at ${plant.name}. Review staffing or spare parts.`;
          level = level === 'warning' ? 'critical' : 'warning';
        }

        if (level === 'critical') {
          await emitAlert(io, {
            tenantId,
            plantId: plant._id.toString(),
            type: 'downtime',
            level: 'critical',
            message,
          });
          const admins = await User.find({
            tenantId,
            plant: plant._id,
            roles: { $in: ['plant_admin', 'global_admin'] },
          })
            .select('email')
            .lean();
          await Promise.all(
            admins
              .filter((admin) => typeof admin.email === 'string')
              .map((admin) =>
                sendAlertEmail(
                  admin.email as string,
                  `Critical maintenance alert – ${plant.name}`,
                  `<p>${message}</p>`,
                ),
              ),
          );
        }

        return {
          plant: plant.name,
          downtimeTrend,
          wrenchTrend,
          level,
          message,
        };
      }),
    );

    res.json(insights);
  } catch (err) {
    next(err);
  }
});

export default router;
