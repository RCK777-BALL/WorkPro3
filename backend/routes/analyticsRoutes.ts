/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
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
  scheduleDashboardExportHandler,
  dashboardMtbfJson,
  dashboardPmComplianceJson,
  dashboardWorkOrderVolumeJson,
  pmWhatIfSimulationsJson,
  corporateSitesJson,
  corporateOverviewJson,
  maintenanceMetricsCsv,
  maintenanceMetricsJson,
  maintenanceMetricsXlsx,
} from '../controllers/AnalyticsController';
import Site from '../models/Site';
import WorkOrder from '../models/WorkOrder';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { Types } from 'mongoose';
import type { UserRole } from '../models/User';
import { buildPmCompletionAnalytics } from '../services/pmAnalytics';

const router = Router();

const CORPORATE_ROLES: UserRole[] = ['global_admin', 'general_manager', 'operations_manager'];

router.use(requireAuth);
router.use(tenantScope);

router.get('/kpis', kpiJson);
router.get('/kpis.csv', kpiCsv);
router.get('/kpis.xlsx', kpiXlsx);
router.get('/kpis.pdf', kpiPdf);

router.get('/trends', trendJson);
router.get('/trends.csv', trendCsv);
router.get('/trends.pdf', trendPdf);

router.get('/maintenance', maintenanceMetricsJson);
router.get('/maintenance.csv', maintenanceMetricsCsv);
router.get('/maintenance.xlsx', maintenanceMetricsXlsx);

router.get('/dashboard/kpis', dashboardKpiJson);
router.get('/dashboard/kpis.csv', dashboardKpiCsv);
router.get('/dashboard/kpis.xlsx', dashboardKpiXlsx);
router.get('/dashboard/kpis.pdf', dashboardKpiPdf);
router.post('/dashboard/exports/schedule', scheduleDashboardExportHandler);
router.get('/dashboard/mtbf', dashboardMtbfJson);
router.get('/dashboard/pm-compliance', dashboardPmComplianceJson);
router.get('/dashboard/work-order-volume', dashboardWorkOrderVolumeJson);
router.get('/pm-optimization/what-if', pmWhatIfSimulationsJson);

const pmCompletionsHandler: AuthedRequestHandler = (req: AuthedRequest, res, next) => {
  void (async () => {
    const tenantId = req.tenantId;
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const months = typeof req.query.months === 'string' ? Number(req.query.months) : undefined;
    const siteId =
      req.siteId && Types.ObjectId.isValid(req.siteId)
        ? new Types.ObjectId(req.siteId)
        : undefined;

    const options = {
      ...(months !== undefined ? { months } : {}),
      ...(siteId ? { siteId } : {}),
    };

    const analytics = await buildPmCompletionAnalytics(new Types.ObjectId(tenantId), options);
    res.json(analytics);
  })().catch(next);
};

router.get('/pm/completions', pmCompletionsHandler);

const globalAnalyticsHandler: AuthedRequestHandler = (req: AuthedRequest, res, next) => {
  void (async () => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const sites = await Site.find({ tenantId }).lean();
    const analytics = await Promise.all(
      sites.map(async (site) => {
        const siteId = site._id;
        const baseFilter = { tenantId, siteId };
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
          { $match: { tenantId, siteId, downtime: { $exists: true } } },
          { $group: { _id: null, totalDowntime: { $sum: '$downtime' } } },
        ]);
        const wrenchTime = await WorkOrder.aggregate<{
          _id: Types.ObjectId | null;
          avgWrenchTime: number;
        }>([
          { $match: { tenantId, siteId, wrenchTime: { $exists: true } } },
          { $group: { _id: null, avgWrenchTime: { $avg: '$wrenchTime' } } },
        ]);
        return {
          plant: site.name,
          siteId: site._id.toString(),
          siteName: site.name,
          tenantId,
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
  })().catch(next);
};

router.get('/global', globalAnalyticsHandler);

router.get(
  '/corporate/sites',
  requireRole(...CORPORATE_ROLES),
  corporateSitesJson,
);

router.get(
  '/corporate/overview',
  requireRole(...CORPORATE_ROLES),
  corporateOverviewJson,
);

export default router;
