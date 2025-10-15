/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { sendResponse } from '../utils/sendResponse';

import Asset from '../models/Asset';
import WorkOrder from '../models/WorkOrder';
import InventoryItem from '../models/InventoryItem';
import Permit from '../models/Permit';
import AuditLog from '../models/AuditLog';

const toObjectId = (value?: string | Types.ObjectId | null) => {
  if (!value) return undefined;
  try {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  } catch (err) {
    return undefined;
  }
};

const resolveTenantId = (req: Request): Types.ObjectId | undefined => {
  const headerTenant = typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : undefined;
  return (
    toObjectId(req.tenantId) ||
    toObjectId(req.user?.tenantId) ||
    toObjectId(headerTenant)
  );
};

const buildTenantMatch = (tenantId?: Types.ObjectId) => (tenantId ? { tenantId } : {});

const computeLivePulse = async (tenantMatch: Record<string, unknown>) => {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const [criticalAlerts, maintenanceDue, pmTotals] = await Promise.all([
    WorkOrder.countDocuments({ ...tenantMatch, priority: 'critical', status: { $ne: 'completed' } }),
    WorkOrder.countDocuments({
      ...tenantMatch,
      dueDate: { $gte: now, $lte: nextWeek },
      status: { $ne: 'completed' },
    }),
    WorkOrder.aggregate([
      { $match: { ...tenantMatch, pmTask: { $exists: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const totals = pmTotals[0];
  const complianceScore = totals?.total
    ? Number(((totals.completed / totals.total) * 100).toFixed(1))
    : 0;

  return {
    criticalAlerts,
    maintenanceDue,
    complianceScore,
    updatedAt: new Date().toISOString(),
  };
};

const computeCommandCenter = async (tenantMatch: Record<string, unknown>) => {
  const now = new Date();
  const [activeWorkOrders, overdueWorkOrders, activePermits, activeAssignments] = await Promise.all([
    WorkOrder.countDocuments({ ...tenantMatch, status: { $ne: 'completed' } }),
    WorkOrder.countDocuments({ ...tenantMatch, dueDate: { $lt: now }, status: { $ne: 'completed' } }),
    Permit.countDocuments({
      ...tenantMatch,
      status: { $in: ['pending', 'active', 'escalated'] },
    }),
    WorkOrder.distinct('assignedTo', {
      ...tenantMatch,
      assignedTo: { $ne: null },
      status: { $in: ['assigned', 'in_progress'] },
    }),
  ]);

  return {
    activeWorkOrders,
    overdueWorkOrders,
    openPermits: activePermits,
    techniciansDispatched: Array.isArray(activeAssignments) ? activeAssignments.length : 0,
  };
};

const computeAnalyticsHighlights = async (tenantMatch: Record<string, unknown>) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [latestWorkOrder, createdThisWeek, completedThisWeek, criticalBacklog] = await Promise.all([
    WorkOrder.findOne(tenantMatch).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    WorkOrder.countDocuments({ ...tenantMatch, createdAt: { $gte: weekAgo } }),
    WorkOrder.countDocuments({ ...tenantMatch, status: 'completed', updatedAt: { $gte: weekAgo } }),
    WorkOrder.countDocuments({ ...tenantMatch, priority: { $in: ['high', 'critical'] }, status: { $ne: 'completed' } }),
  ]);

  const completionRate = createdThisWeek
    ? Number(((completedThisWeek / createdThisWeek) * 100).toFixed(1))
    : 0;

  return {
    lastUpdatedAt: latestWorkOrder?.updatedAt?.toISOString() ?? null,
    completionRate,
    criticalBacklog,
  };
};

const computeReportHighlights = async (tenantMatch: Record<string, unknown>) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const [completedThisWeek, scheduledUpcoming] = await Promise.all([
    WorkOrder.countDocuments({
      ...tenantMatch,
      status: 'completed',
      completedAt: { $gte: startOfWeek },
    }),
    WorkOrder.countDocuments({
      ...tenantMatch,
      dueDate: { $gte: now, $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
      status: { $in: ['requested', 'assigned'] },
    }),
  ]);

  const latestCompletion = await WorkOrder.findOne({
    ...tenantMatch,
    status: 'completed',
  })
    .sort({ completedAt: -1 })
    .select('completedAt')
    .lean();

  return {
    generatedThisWeek: completedThisWeek,
    scheduledReports: scheduledUpcoming,
    lastExportAt: latestCompletion?.completedAt?.toISOString() ?? null,
  };
};

const computePermitSummary = async (tenantMatch: Record<string, unknown>) => {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const [pending, expiringSoon] = await Promise.all([
    Permit.countDocuments({
      ...tenantMatch,
      status: { $in: ['pending', 'active', 'escalated'] },
    }),
    Permit.countDocuments({
      ...tenantMatch,
      validTo: { $gte: now, $lte: nextWeek },
    }),
  ]);

  return { pending, expiringSoon };
};

const computeWorkOrderSummary = async (tenantMatch: Record<string, unknown>) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [active, completedToday, onTimeAgg] = await Promise.all([
    WorkOrder.countDocuments({ ...tenantMatch, status: { $ne: 'completed' } }),
    WorkOrder.countDocuments({
      ...tenantMatch,
      status: 'completed',
      completedAt: { $gte: startOfDay },
    }),
    WorkOrder.aggregate([
      {
        $match: {
          ...tenantMatch,
          status: 'completed',
          dueDate: { $ne: null },
          completedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: {
            $sum: {
              $cond: [{ $lte: ['$completedAt', '$dueDate'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const aggregates = onTimeAgg[0];
  const onTimeCompletionRate = aggregates?.total
    ? Number(((aggregates.onTime / aggregates.total) * 100).toFixed(1))
    : 0;

  return { active, completedToday, onTimeCompletionRate };
};

const computeImportSummary = async (
  tenantId?: Types.ObjectId,
  tenantMatch: Record<string, unknown> = {},
) => {
  if (!tenantId) {
    return {
      lastSync: null,
      processedItems: 0,
      failed: 0,
    };
  }

  const [latestLog, assetCount, inventoryCount] = await Promise.all([
    AuditLog.findOne({ tenantId, action: 'import.sync' })
      .sort({ ts: -1 })
      .lean(),
    Asset.countDocuments(tenantMatch),
    InventoryItem.countDocuments(tenantMatch),
  ]);

  const processedItems = Number(
    (latestLog?.after as { processedCount?: unknown } | undefined)?.processedCount ?? 0,
  );

  return {
    lastSync: latestLog?.ts?.toISOString() ?? null,
    processedItems: processedItems || assetCount + inventoryCount,
    failed: 0,
  };
};

export const getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);

    const [livePulse, commandCenter, analytics, reports, permits, workOrders, imports] =
      await Promise.all([
        computeLivePulse(tenantMatch),
        computeCommandCenter(tenantMatch),
        computeAnalyticsHighlights(tenantMatch),
        computeReportHighlights(tenantMatch),
        computePermitSummary(tenantMatch),
        computeWorkOrderSummary(tenantMatch),
        computeImportSummary(tenantId, tenantMatch),
      ]);

    sendResponse(res, {
      livePulse,
      commandCenter,
      analytics,
      reports,
      permits,
      workOrders,
      imports,
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboardLivePulse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const metrics = await computeLivePulse(tenantMatch);
    sendResponse(res, metrics);
  } catch (err) {
    next(err);
  }
};

export const getDashboardWorkOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '6'), 10) || 6, 25);

    const workOrders = await WorkOrder.find(tenantMatch)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('assetId', 'name')
      .lean();

    const payload = workOrders.map((wo) => ({
      id: wo._id.toString(),
      title: wo.title,
      status: wo.status,
      priority: wo.priority,
      dueDate: wo.dueDate ?? null,
      updatedAt: wo.updatedAt ?? null,
      assetName: (wo as any).assetId?.name ?? null,
    }));

    sendResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

export const getDashboardPermits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '6'), 10) || 6, 25);

    const permits = await Permit.find(tenantMatch)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('permitNumber type status riskLevel validTo updatedAt')
      .lean();

    const payload = permits.map((permit) => ({
      id: permit._id.toString(),
      number: permit.permitNumber,
      type: permit.type,
      status: permit.status,
      riskLevel: permit.riskLevel ?? null,
      validTo: permit.validTo ?? null,
      updatedAt: permit.updatedAt ?? null,
    }));

    sendResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

export const postDashboardImportSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant not resolved', 400);
      return;
    }

    const tenantMatch = buildTenantMatch(tenantId);
    const [assetCount, inventoryCount] = await Promise.all([
      Asset.countDocuments(tenantMatch),
      InventoryItem.countDocuments(tenantMatch),
    ]);

    const processedCount = assetCount + inventoryCount;

    await AuditLog.create({
      tenantId,
      userId: toObjectId(req.user?._id ?? req.user?.id ?? null),
      action: 'import.sync',
      entityType: 'data-import',
      entityId: 'dashboard',
      after: {
        status: 'success',
        processedCount,
      },
      ts: new Date(),
    });

    sendResponse(res, {
      processedCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const postLaunchPlanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    if (tenantId) {
      await AuditLog.create({
        tenantId,
        userId: toObjectId(req.user?._id ?? req.user?.id ?? null),
        action: 'planner.launch',
        entityType: 'command-center',
        entityId: 'planner',
        after: {
          from: 'dashboard',
        },
        ts: new Date(),
      });
    }

    sendResponse(res, { message: 'Planner launch recorded' });
  } catch (err) {
    next(err);
  }
};

export default {
  getDashboardOverview,
  getDashboardLivePulse,
  getDashboardWorkOrders,
  getDashboardPermits,
  postDashboardImportSync,
  postLaunchPlanner,
};
