/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequestHandler } from '../types/http';

import WorkOrder from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
import TimeSheet from '../models/TimeSheet';
import Asset from '../models/Asset';
import Permit from '../models/Permit';
import PmTask from '../models/PMTask';
import { sendResponse } from '../utils/sendResponse';
import { LABOR_RATE } from '../config/env';

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
  mttr: number;
  slaCompliance: number;
};

type WorkOrderFilters = {
  department?: Types.ObjectId | undefined;
  line?: Types.ObjectId | undefined;
  statuses?: string[] | undefined;
  assignedTo?: Types.ObjectId | undefined;
};

const ALL_WORK_ORDER_STATUSES = [
  'requested',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;
const ALL_STATUS_SET = new Set<string>(ALL_WORK_ORDER_STATUSES);

const STATUS_ALIASES: Record<string, string[]> = {
  open: ['requested', 'assigned', 'in_progress'],
  active: ['assigned', 'in_progress'],
  pending: ['requested'],
  completed: ['completed'],
  closed: ['completed', 'cancelled'],
};

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  try {
    return new Types.ObjectId(value);
  } catch {
    return undefined;
  }
};

const normalizeStatuses = (raw: unknown): string[] | undefined => {
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw.join(',') : String(raw);
  if (!value.trim()) return undefined;

  const tokens = value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const statuses = new Set<string>();
  tokens.forEach((token) => {
    if (STATUS_ALIASES[token]) {
      STATUS_ALIASES[token].forEach((s) => statuses.add(s));
    } else if (ALL_STATUS_SET.has(token)) {
      statuses.add(token);
    }
  });

  return statuses.size ? Array.from(statuses) : undefined;
};

const pickStatuses = (filters: WorkOrderFilters, allowed: string[]): string[] => {
  if (!filters.statuses || filters.statuses.length === 0) {
    return allowed;
  }
  const allowedSet = new Set(allowed);
  return filters.statuses.filter((status) => allowedSet.has(status));
};

const buildWorkOrderMatch = (
  match: Record<string, unknown>,
  filters: WorkOrderFilters,
): Record<string, unknown> => {
  const base: Record<string, unknown> = { ...match };
  if (filters.department) base.department = filters.department;
  if (filters.line) base.line = filters.line;
  if (filters.assignedTo) base.assignedTo = filters.assignedTo;
  return base;
};

export const calculateSummary = async (
  match: Record<string, unknown>,
  filters: WorkOrderFilters,
): Promise<Summary> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const baseWorkOrderMatch = buildWorkOrderMatch(match, filters);
  const pmMatchBase = { ...baseWorkOrderMatch, pmTask: { $exists: true } };
  const pmStatuses = pickStatuses(filters, [
    'requested',
    'assigned',
    'in_progress',
    'completed',
  ]);
  const pmCompletedStatuses = pickStatuses(filters, ['completed']);
  const backlogStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress']);

  const cmStatuses = pickStatuses(filters, [
    'requested',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
  ]);

  const [
    pmTotal,
    pmCompleted,
    woBacklog,
    cmCount,
    downtimeAgg,
    timesheetAgg,
    mttrAgg,
    slaAgg,
  ] = await Promise.all([
    pmStatuses.length
      ? WorkOrder.countDocuments({ ...pmMatchBase, status: { $in: pmStatuses } })
      : 0,
    pmCompletedStatuses.length
      ? WorkOrder.countDocuments({ ...pmMatchBase, status: { $in: pmCompletedStatuses } })
      : 0,
    backlogStatuses.length
      ? WorkOrder.countDocuments({ ...baseWorkOrderMatch, status: { $in: backlogStatuses } })
      : 0,
    cmStatuses.length
      ? WorkOrder.countDocuments({
          ...baseWorkOrderMatch,
          pmTask: { $exists: false },
          status: { $in: cmStatuses },
        })
      : 0,
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
    pmCompletedStatuses.length
      ? WorkOrder.aggregate([
          {
            $match: {
              ...baseWorkOrderMatch,
              status: { $in: pmCompletedStatuses.length ? pmCompletedStatuses : ['completed'] },
              completedAt: { $ne: null },
              createdAt: { $ne: null },
            },
          },
          {
            $project: {
              durationHours: {
                $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60],
              },
            },
          },
          { $group: { _id: null, avgDuration: { $avg: '$durationHours' } } },
        ])
      : [],
    pmCompletedStatuses.length
      ? WorkOrder.aggregate([
          {
            $match: {
              ...baseWorkOrderMatch,
              status: { $in: pmCompletedStatuses.length ? pmCompletedStatuses : ['completed'] },
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
        ])
      : [],
  ]);

  const maintenanceHours = downtimeAgg[0]?.hours ?? 0;
  const totalHours = timesheetAgg[0]?.hours ?? 0;

  const pmCompliance = pmTotal ? pmCompleted / pmTotal : 0;
  const downtimeThisMonth = maintenanceHours;
  const costMTD = maintenanceHours * LABOR_RATE;
  const cmVsPmRatio = pmTotal ? cmCount / pmTotal : 0;
  const wrenchTimePct = totalHours ? (maintenanceHours / totalHours) * 100 : 0;
  const mttr = Number(((mttrAgg[0]?.avgDuration as number | undefined) ?? 0).toFixed(1));
  const slaTotals = slaAgg[0] as { total?: number; onTime?: number } | undefined;
  const slaCompliance = slaTotals?.total
    ? Number((((slaTotals.onTime ?? 0) / slaTotals.total) * 100).toFixed(1))
    : 0;

  return {
    pmCompliance,
    woBacklog,
    downtimeThisMonth,
    costMTD,
    cmVsPmRatio,
    wrenchTimePct,
    mttr,
    slaCompliance,
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

    const departmentId = toObjectId(req.query.department);
    const lineId = toObjectId(req.query.line);
    const statuses = normalizeStatuses(req.query.status);
    const assignedToParam = typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined;
    const assignedTo =
      assignedToParam === 'me'
        ? toObjectId((req.user?._id as string | undefined) ?? (req.user?.id as string | undefined))
        : toObjectId(assignedToParam);

    const filters: WorkOrderFilters = {
      department: departmentId,
      line: lineId,
      statuses: statuses,
      assignedTo,
    };

    const summary = await calculateSummary(match, filters);
    const workOrderMatch = buildWorkOrderMatch(match, filters);

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const openStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress']);
    const completedStatuses = pickStatuses(filters, ['completed']);
    const pmDueStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress']);

    const [
      openWorkOrders,
      overdueWorkOrders,
      completedWorkOrders,
      pmDueNext7Days,
      permitsOpen,
      activeAssets,
      totalAssets,
      activePmTasks,
      criticalActiveAssets,
      criticalTotalAssets,
    ] = await Promise.all([
      openStatuses.length
        ? WorkOrder.countDocuments({
            ...workOrderMatch,
            status: { $in: openStatuses },
          })
        : 0,
      openStatuses.length
        ? WorkOrder.countDocuments({
            ...workOrderMatch,
            status: { $in: openStatuses },
            dueDate: { $lt: now },
          })
        : 0,
      completedStatuses.length
        ? WorkOrder.countDocuments({
            ...workOrderMatch,
            status: { $in: completedStatuses },
          })
        : 0,
      pmDueStatuses.length
        ? WorkOrder.countDocuments({
            ...workOrderMatch,
            status: { $in: pmDueStatuses },
            pmTask: { $exists: true },
            dueDate: { $gte: now, $lte: nextWeek },
          })
        : 0,
      Permit.countDocuments({
        ...match,
        status: { $in: ['pending', 'active', 'escalated'] },
      }),
      Asset.countDocuments({ ...match, status: 'Active' }),
      Asset.countDocuments(match),
      (() => {
        const pmFilter: Record<string, unknown> = { active: true };
        if (tenantId) pmFilter.tenantId = tenantId;
        return PmTask.countDocuments(pmFilter);
      })(),
      Asset.countDocuments({ ...match, status: 'Active', criticality: 'high' }),
      Asset.countDocuments({ ...match, criticality: 'high' }),
    ]);

    const assetAvailability = totalAssets
      ? Math.round((activeAssets / totalAssets) * 100)
      : 0;
    const assetAvailabilityCritical = criticalTotalAssets
      ? Math.round((criticalActiveAssets / criticalTotalAssets) * 100)
      : totalAssets
        ? assetAvailability
        : 0;
    const complianceScore = Number((summary.pmCompliance * 100).toFixed(1));

    const payload = {
      ...summary,
      openWorkOrders,
      overdueWorkOrders,
      completedWorkOrders,
      pmDueNext7Days,
      permitsOpen,
      complianceScore,
      assetAvailability,
      assetAvailabilityCritical,
      activePmTasks,
    };

    sendResponse(res, payload);
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

    const filters: WorkOrderFilters = {
      department: toObjectId(req.query.department),
      line: toObjectId(req.query.line),
      statuses: normalizeStatuses(req.query.status),
      assignedTo:
        typeof req.query.assignedTo === 'string'
          ? req.query.assignedTo === 'me'
            ? toObjectId((req.user?._id as string | undefined) ?? (req.user?.id as string | undefined))
            : toObjectId(req.query.assignedTo)
          : undefined,
    };

    const summary = await calculateSummary(match, filters);
    const trends: Record<keyof Summary, number[]> = {
      pmCompliance: Array(10).fill(summary.pmCompliance),
      woBacklog: Array(10).fill(summary.woBacklog),
      downtimeThisMonth: Array(10).fill(summary.downtimeThisMonth),
      costMTD: Array(10).fill(summary.costMTD),
      cmVsPmRatio: Array(10).fill(summary.cmVsPmRatio),
      wrenchTimePct: Array(10).fill(summary.wrenchTimePct),
      mttr: Array(10).fill(summary.mttr),
      slaCompliance: Array(10).fill(summary.slaCompliance),
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

