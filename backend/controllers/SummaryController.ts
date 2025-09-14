/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthedRequestHandler } from '../types/http';

import WorkOrder from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
import TimeSheet from '../models/TimeSheet';
import Asset from '../models/Asset';
import { sendResponse } from '../utils/sendResponse';

/**
 * Helper to resolve the tenant id from the request. It checks the `tenantId`
 * injected by auth middleware, falls back to the authenticated user and then
 * to the `x-tenant-id` header.
 */
const getTenantId = (req: Request): string | undefined => {
  return (
    req.tenantId ||
    req.user?.tenantId ||
    (typeof req.headers['x-tenant-id'] === 'string'
      ? req.headers['x-tenant-id']
      : undefined)
  );
};

type Summary = {
  pmCompliance: number;
  woBacklog: number;
  downtimeThisMonth: number;
  costMTD: number;
  cmVsPmRatio: number;
  wrenchTimePct: number;
};

const calculateSummary = async (
  match: Record<string, unknown>,
): Promise<Summary> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const pmMatch = { ...match, pmTask: { $exists: true } };

  const [
    pmTotal,
    pmCompleted,
    woBacklog,
    cmCount,
    downtimeAgg,
    timesheetAgg,
  ] = await Promise.all([
    WorkOrder.countDocuments(pmMatch),
    WorkOrder.countDocuments({ ...pmMatch, status: 'completed' }),
    WorkOrder.countDocuments({ ...match, status: { $ne: 'completed' } }),
    WorkOrder.countDocuments({ ...match, pmTask: { $exists: false } }),
    WorkHistory.aggregate([
      {
        $match: {
          ...match,
          completedAt: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
    ]),
    TimeSheet.aggregate([
      {
        $match: { ...match, date: { $gte: startOfMonth, $lt: endOfMonth } },
      },
      { $group: { _id: null, hours: { $sum: '$totalHours' } } },
    ]),
  ]);

  const maintenanceHours = downtimeAgg[0]?.hours ?? 0;
  const totalHours = timesheetAgg[0]?.hours ?? 0;

  const pmCompliance = pmTotal ? pmCompleted / pmTotal : 0;
  const downtimeThisMonth = maintenanceHours;
  const costMTD = maintenanceHours * 50;
  const cmVsPmRatio = pmTotal ? cmCount / pmTotal : 0;
  const wrenchTimePct = totalHours ? (maintenanceHours / totalHours) * 100 : 0;

  return {
    pmCompliance,
    woBacklog,
    downtimeThisMonth,
    costMTD,
    cmVsPmRatio,
    wrenchTimePct,
  };
};

export const getSummary: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === 'string'
        ? req.query.tenantId
        : getTenantId(req);
    const siteId =
      typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
    const match: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (siteId) match.siteId = siteId;

    const summary = await calculateSummary(match);

    sendResponse(res, summary);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getSummaryTrends: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === 'string'
        ? req.query.tenantId
        : getTenantId(req);
    const siteId =
      typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
    const match: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (siteId) match.siteId = siteId;

    const summary = await calculateSummary(match);
    const trends: Record<keyof Summary, number[]> = {
      pmCompliance: Array(10).fill(summary.pmCompliance),
      woBacklog: Array(10).fill(summary.woBacklog),
      downtimeThisMonth: Array(10).fill(summary.downtimeThisMonth),
      costMTD: Array(10).fill(summary.costMTD),
      cmVsPmRatio: Array(10).fill(summary.cmVsPmRatio),
      wrenchTimePct: Array(10).fill(summary.wrenchTimePct),
    };

    sendResponse(res, trends);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getAssetSummary: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await Asset.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    sendResponse(res, summary);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getWorkOrderSummary: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await WorkOrder.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    sendResponse(res, summary);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getUpcomingMaintenance: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getTenantId(req);
    const match: any = tenantId ? { tenantId } : {};
    const now = new Date();
    match.dueDate = { $gte: now };
    match.status = { $ne: 'completed' };
    const tasks = await WorkOrder.find(match)
      .sort({ dueDate: 1 })
      .limit(10)
      .populate('asset');
    sendResponse(res, tasks);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getCriticalAlerts: AuthedRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getTenantId(req);
    const match: any = tenantId ? { tenantId } : {};
    match.priority = 'critical';
    match.status = { $ne: 'completed' };
    const alerts = await WorkOrder.find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('asset');
    sendResponse(res, alerts);
    return;
  } catch (err) {
    return next(err);
  }
};

export default {
  getSummary,
  getAssetSummary,
  getWorkOrderSummary,
  getUpcomingMaintenance,
  getCriticalAlerts,
};

