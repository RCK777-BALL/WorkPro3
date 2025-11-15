/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  kpiJson,
  kpiCsv,
  kpiXlsx,
  kpiPdf,
  trendJson,
  trendCsv,
  trendPdf,
  dashboardKpiJson,
  dashboardKpiCsv,
  dashboardKpiXlsx,
  dashboardKpiPdf,
  pmWhatIfSimulationsJson,
} from '../controllers/AnalyticsController';
import Plant from '../models/Plant';
import WorkOrder from '../models/WorkOrder';
import type { AuthedRequest } from '../types/http';
import { Types } from 'mongoose';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/kpis', kpiJson);
router.get('/kpis.csv', kpiCsv);
router.get('/kpis.xlsx', kpiXlsx);
router.get('/kpis.pdf', kpiPdf);

router.get('/trends', trendJson);
router.get('/trends.csv', trendCsv);
router.get('/trends.pdf', trendPdf);

router.get('/dashboard/kpis', dashboardKpiJson);
router.get('/dashboard/kpis.csv', dashboardKpiCsv);
router.get('/dashboard/kpis.xlsx', dashboardKpiXlsx);
router.get('/dashboard/kpis.pdf', dashboardKpiPdf);
router.get('/pm-optimization/what-if', pmWhatIfSimulationsJson);

router.get('/global', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const plants = await Plant.find({ tenantId }).lean();
    const analytics = await Promise.all(
      plants.map(async (plant) => {
        const plantId = plant._id;
        const baseFilter = { tenantId, plant: plantId };
        const totalWorkOrders = await WorkOrder.countDocuments(baseFilter);
        const completedWorkOrders = await WorkOrder.countDocuments({
          ...baseFilter,
          status: 'completed',
        });
        const preventiveCount = await WorkOrder.countDocuments({
          ...baseFilter,
          type: 'preventive',
        });
        const downtime = await WorkOrder.aggregate<{
          _id: Types.ObjectId | null;
          totalDowntime: number;
        }>([
          { $match: { tenantId, plant: plantId, downtime: { $exists: true } } },
          { $group: { _id: null, totalDowntime: { $sum: '$downtime' } } },
        ]);
        const wrenchTime = await WorkOrder.aggregate<{
          _id: Types.ObjectId | null;
          avgWrenchTime: number;
        }>([
          { $match: { tenantId, plant: plantId, wrenchTime: { $exists: true } } },
          { $group: { _id: null, avgWrenchTime: { $avg: '$wrenchTime' } } },
        ]);
        return {
          plant: plant.name,
          totalWorkOrders,
          completedWorkOrders,
          pmCompliance:
            preventiveCount > 0
              ? Math.round((completedWorkOrders / preventiveCount) * 100)
              : 0,
          avgWrenchTime: wrenchTime[0]?.avgWrenchTime ?? 0,
          downtimeHours: downtime[0]?.totalDowntime ?? 0,
        };
      }),
    );
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

export default router;
