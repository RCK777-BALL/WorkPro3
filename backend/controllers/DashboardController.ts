/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { sendResponse } from '../utils';


import Asset from '../models/Asset';
import WorkOrder from '../models/WorkOrder';
import InventoryItem from '../models/InventoryItem';
import Permit from '../models/Permit';
import AuditLog from '../models/AuditLog';
import PmTask from '../models/PMTask';
import { calculateSummary } from './SummaryController';

const toObjectId = (value?: string | Types.ObjectId | null) => {
  if (!value) return undefined;
  try {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  } catch {
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

type DashboardFilters = {
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  statuses?: string[];
  assignedTo?: Types.ObjectId;
};

const STATUS_ALIASES: Record<string, string[]> = {
  open: ['requested', 'assigned', 'in_progress', 'paused'],
  active: ['assigned', 'in_progress', 'paused'],
  pending: ['requested'],
  completed: ['completed'],
  closed: ['completed', 'cancelled'],
};

const ALL_WORK_ORDER_STATUSES = [
  'requested',
  'assigned',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
] as const;

const ALL_STATUS_SET = new Set<string>(ALL_WORK_ORDER_STATUSES);

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
      STATUS_ALIASES[token].forEach((status) => statuses.add(status));
    } else if (ALL_STATUS_SET.has(token)) {
      statuses.add(token);
    }
  });

  return statuses.size ? Array.from(statuses) : undefined;
};

const pickStatuses = (filters: DashboardFilters, allowed: string[]): string[] => {
  if (!filters.statuses || filters.statuses.length === 0) {
    return allowed;
  }
  const allowedSet = new Set(allowed);
  return filters.statuses.filter((status) => allowedSet.has(status));
};

const buildWorkOrderMatch = (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
): Record<string, unknown> => {
  const match = { ...tenantMatch } as Record<string, unknown>;
  if (filters.department) match.department = filters.department;
  if (filters.line) match.line = filters.line;
  if (filters.assignedTo) match.assignedTo = filters.assignedTo;
  return match;
};

const resolveDashboardFilters = (req: Request): DashboardFilters => {
  const department = toObjectId(
    typeof req.query.department === 'string' ? req.query.department : null,
  );
  const line = toObjectId(typeof req.query.line === 'string' ? req.query.line : null);
  const statuses = normalizeStatuses(req.query.status);
  const assignedParam = typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined;
  const assignedTo =
    assignedParam === 'me'
      ? toObjectId(req.user?._id ?? (req.user as any)?.id ?? null)
      : toObjectId(assignedParam);

  const filters: DashboardFilters = {};
  if (department) filters.department = department;
  if (line) filters.line = line;
  if (statuses && statuses.length) filters.statuses = statuses;
  if (assignedTo) filters.assignedTo = assignedTo;

  return filters;
};

const computeLivePulse = async (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const activeStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);
  const pmStatuses = pickStatuses(filters, [
    'requested',
    'assigned',
    'in_progress',
    'completed',
  ]);
  const pmCompletedStatuses = pickStatuses(filters, ['completed']);

  const criticalAlertsPromise = activeStatuses.length
    ? WorkOrder.countDocuments({
        ...workOrderMatch,
        priority: 'critical',
        status: { $in: activeStatuses },
      })
    : Promise.resolve(0);

  const maintenanceDuePromise = activeStatuses.length
    ? WorkOrder.countDocuments({
        ...workOrderMatch,
        status: { $in: activeStatuses },
        dueDate: { $gte: now, $lte: nextWeek },
      })
    : Promise.resolve(0);

  const pmTotalsPromise = pmStatuses.length
    ? WorkOrder.aggregate([
        {
          $match: {
            ...workOrderMatch,
            pmTask: { $exists: true },
            status: { $in: pmStatuses },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      pmCompletedStatuses.length ? pmCompletedStatuses : ['completed'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
    : Promise.resolve<{ total?: number; completed?: number }[]>([]);

  const techniciansPromise = activeStatuses.length
    ? WorkOrder.distinct('assignedTo', {
        ...workOrderMatch,
        status: { $in: activeStatuses },
        assignedTo: { $ne: null },
      })
    : Promise.resolve([]);

  const permitsRequireApprovalPromise = Permit.countDocuments({
    ...tenantMatch,
    status: { $in: ['pending'] },
  });

  const [criticalAlerts, maintenanceDue, pmTotals, technicians, permitsRequireApproval] =
    await Promise.all([
      criticalAlertsPromise,
      maintenanceDuePromise,
      pmTotalsPromise,
      techniciansPromise,
      permitsRequireApprovalPromise,
    ]);

  const totals = pmTotals[0];
  const complianceScore = totals?.total
    ? Number(((totals.completed / totals.total) * 100).toFixed(1))
    : 0;
  const techniciansCheckedIn = Array.isArray(technicians)
    ? technicians.filter((value) => Boolean(value)).length
    : 0;

  return {
    criticalAlerts,
    maintenanceDue,
    complianceScore,
    techniciansCheckedIn,
    permitsRequireApproval,
    updatedAt: new Date().toISOString(),
  };
};

const computeCommandCenter = async (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const now = new Date();
  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const openStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);
  const activeStatuses = pickStatuses(filters, ['assigned', 'in_progress', 'paused']);

  const [activeWorkOrders, overdueWorkOrders, activePermits, activeAssignments] = await Promise.all([
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
    Permit.countDocuments({
      ...tenantMatch,
      status: { $in: ['pending', 'active', 'escalated'] },
    }),
    activeStatuses.length
      ? WorkOrder.distinct('assignedTo', {
          ...workOrderMatch,
          status: { $in: activeStatuses },
          assignedTo: { $ne: null },
        })
      : [],
  ]);

  return {
    activeWorkOrders,
    overdueWorkOrders,
    openPermits: activePermits,
    techniciansDispatched: Array.isArray(activeAssignments) ? activeAssignments.length : 0,
  };
};

const computeAnalyticsHighlights = async (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const allStatuses = pickStatuses(filters, [
    'requested',
    'assigned',
    'in_progress',
    'paused',
    'completed',
    'cancelled',
  ]);
  const completedStatuses = pickStatuses(filters, ['completed']);
  const backlogStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);

  const latestMatch: Record<string, unknown> = { ...workOrderMatch };
  if (allStatuses.length) {
    latestMatch.status = { $in: allStatuses };
  }

  const [latestWorkOrder, createdThisWeek, completedThisWeek, criticalBacklog] = await Promise.all([
    // use find + limit(1) and then extract the first item to avoid calling .sort on a Promise-returning overload
    WorkOrder.find(latestMatch).sort({ updatedAt: -1 }).select('updatedAt').limit(1).lean().then((arr) => (Array.isArray(arr) ? arr[0] ?? null : null)),
    allStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: allStatuses },
          createdAt: { $gte: weekAgo },
        })
      : 0,
    completedStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: completedStatuses },
          updatedAt: { $gte: weekAgo },
        })
      : 0,
    backlogStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: backlogStatuses },
          priority: { $in: ['high', 'critical'] },
        })
      : 0,
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

const computeReportHighlights = async (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const completedStatuses = pickStatuses(filters, ['completed']);
  const scheduledStatuses = pickStatuses(filters, ['requested', 'assigned']);

  const [completedThisWeek, scheduledUpcoming] = await Promise.all([
    completedStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: completedStatuses },
          completedAt: { $gte: startOfWeek },
        })
      : 0,
    scheduledStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: scheduledStatuses },
          dueDate: { $gte: now, $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
        })
      : 0,
  ]);

  const latestCompletion = await WorkOrder.findOne({
    ...workOrderMatch,
    status: { $in: completedStatuses.length ? completedStatuses : ['completed'] },
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

const computeWorkOrderSummary = async (
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const activeStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);
  const completedStatuses = pickStatuses(filters, ['completed']);

  const [active, completedToday, onTimeAgg] = await Promise.all([
    activeStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: activeStatuses },
        })
      : 0,
    completedStatuses.length
      ? WorkOrder.countDocuments({
          ...workOrderMatch,
          status: { $in: completedStatuses },
          completedAt: { $gte: startOfDay },
        })
      : 0,
    completedStatuses.length
      ? WorkOrder.aggregate([
          {
            $match: {
              ...workOrderMatch,
              status: { $in: completedStatuses.length ? completedStatuses : ['completed'] },
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

  const aggregates = onTimeAgg[0];
  const onTimeCompletionRate = aggregates?.total
    ? Number(((aggregates.onTime / aggregates.total) * 100).toFixed(1))
    : 0;

  return { active, completedToday, onTimeCompletionRate };
};

const computeSummarySnapshot = async (
  tenantId: Types.ObjectId | undefined,
  tenantMatch: Record<string, unknown>,
  filters: DashboardFilters,
) => {
  const summary = await calculateSummary(tenantMatch, filters);
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const workOrderMatch = buildWorkOrderMatch(tenantMatch, filters);
  const openStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);
  const completedStatuses = pickStatuses(filters, ['completed']);
  const pmDueStatuses = pickStatuses(filters, ['requested', 'assigned', 'in_progress', 'paused']);

  const [
    openWorkOrders,
    overdueWorkOrders,
    completedWorkOrders,
    pmDueNext7Days,
    permitsOpen,
    activeAssets,
    totalAssets,
    criticalActiveAssets,
    criticalTotalAssets,
    activePmTasks,
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
      ...tenantMatch,
      status: { $in: ['pending', 'active', 'escalated'] },
    }),
    Asset.countDocuments({ ...tenantMatch, status: 'Active' }),
    Asset.countDocuments(tenantMatch),
    Asset.countDocuments({ ...tenantMatch, status: 'Active', criticality: 'high' }),
    Asset.countDocuments({ ...tenantMatch, criticality: 'high' }),
    (() => {
      const pmFilter: Record<string, unknown> = { active: true };
      if (tenantId) pmFilter.tenantId = tenantId;
      return PmTask.countDocuments(pmFilter);
    })(),
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

  return {
    summary,
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

const toTitle = (value: string | undefined) =>
  value
    ? value
        .replace(/[_.-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim()
    : '';

const resolveEntityType = (entityType?: string) => {
  if (!entityType) return 'Activity';
  if (/work[-_ ]?order/i.test(entityType)) return 'Work Order';
  if (/permit/i.test(entityType)) return 'Permit';
  if (/pm[-_ ]?task/i.test(entityType)) return 'PM Task';
  if (/compliance/i.test(entityType)) return 'Compliance';
  if (/asset/i.test(entityType)) return 'Asset';
  return toTitle(entityType) || 'Activity';
};

const resolveReference = (log: any): string => {
  const afterRef = log?.after?.reference ?? log?.after?.ref ?? log?.after?.code;
  if (typeof afterRef === 'string' && afterRef.trim()) return afterRef;
  const beforeRef = log?.before?.reference ?? log?.before?.ref ?? log?.before?.code;
  if (typeof beforeRef === 'string' && beforeRef.trim()) return beforeRef;
  const entityId = log?.entityId;
  if (!entityId) return '';
  if (typeof entityId === 'string') return entityId;
  if (typeof entityId === 'number') return String(entityId);
  if (typeof entityId?.toString === 'function') return entityId.toString();
  return '';
};

const resolveEntityLink = (log: any): string | null => {
  const ref = resolveReference(log);
  if (!ref) return null;
  const type = (log?.entityType ?? '').toString().toLowerCase();
  if (type.includes('work')) {
    return `/workorders/${ref}`;
  }
  if (type.includes('permit')) {
    return `/permits/${ref}`;
  }
  if (type.includes('pm')) {
    return `/pm/${ref}`;
  }
  return null;
};

const getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const filters = resolveDashboardFilters(req);

    const [livePulse, commandCenter, analytics, reports, permits, workOrders, imports] =
      await Promise.all([
        computeLivePulse(tenantMatch, filters),
        computeCommandCenter(tenantMatch, filters),
        computeAnalyticsHighlights(tenantMatch, filters),
        computeReportHighlights(tenantMatch, filters),
        computePermitSummary(tenantMatch),
        computeWorkOrderSummary(tenantMatch, filters),
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

const getDashboardLivePulse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const filters = resolveDashboardFilters(req);
    const metrics = await computeLivePulse(tenantMatch, filters);
    sendResponse(res, metrics);
  } catch (err) {
    next(err);
  }
};

const getDashboardWorkOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '6'), 10) || 6, 25);
    const filters = resolveDashboardFilters(req);
    const match = buildWorkOrderMatch(tenantMatch, filters);
    if (filters.statuses && filters.statuses.length) {
      match.status = { $in: filters.statuses };
    }

    const workOrders = await WorkOrder.find(match)
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

const getDashboardRecentActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '10'), 10) || 10, 50);

    const logs = await AuditLog.find(tenantMatch)
      .sort({ ts: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    const items = logs.map((log) => {
      const user: any = (log as any).userId ?? null;
      const userLabel =
        log.actor?.name?.trim() ||
        log.actor?.email?.trim() ||
        (user?.name as string | undefined)?.trim() ||
        (user?.email as string | undefined)?.trim() ||
        'System';
      return {
        id: log._id?.toString() ?? `${log.entityType}-${log.ts?.getTime?.() ?? Date.now()}`,
        type: resolveEntityType(log.entityType),
        action: toTitle(log.action),
        ref: resolveReference(log),
        user: userLabel,
        time: log.ts instanceof Date ? log.ts.toISOString() : new Date().toISOString(),
        link: resolveEntityLink(log),
      };
    });

    sendResponse(res, items);
  } catch (err) {
    next(err);
  }
};

const getDashboardPermits = async (req: Request, res: Response, next: NextFunction) => {
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

const getDashboardExportPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    const tenantMatch = buildTenantMatch(tenantId);
    const filters = resolveDashboardFilters(req);

    const [
      summarySnapshot,
      livePulse,
      commandCenter,
      analytics,
      reports,
      permits,
      workOrders,
      imports,
    ] = await Promise.all([
      computeSummarySnapshot(tenantId, tenantMatch, filters),
      computeLivePulse(tenantMatch, filters),
      computeCommandCenter(tenantMatch, filters),
      computeAnalyticsHighlights(tenantMatch, filters),
      computeReportHighlights(tenantMatch, filters),
      computePermitSummary(tenantMatch),
      computeWorkOrderSummary(tenantMatch, filters),
      computeImportSummary(tenantId, tenantMatch),
    ]);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    (doc as any).on('error', (error: unknown) => {
      next(error);
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=workpro3-dashboard.pdf');
    doc.pipe(res);

    doc.fontSize(20).fillColor('#0f172a').text('WorkPro3 Dashboard Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#475569');
    const filtersApplied: string[] = [];
    if (typeof req.query.department === 'string') filtersApplied.push(`Department: ${req.query.department}`);
    if (typeof req.query.line === 'string') filtersApplied.push(`Line: ${req.query.line}`);
    if (typeof req.query.status === 'string') filtersApplied.push(`Status: ${req.query.status}`);
    if (filters.assignedTo) filtersApplied.push('Assignments: Scoped to technician');
    doc.text(`Generated at: ${new Date().toISOString()}`);
    doc.text(`Filters: ${filtersApplied.length ? filtersApplied.join(', ') : 'None'}`);
    doc.moveDown();

    doc.fontSize(14).fillColor('#0f172a').text('Key metrics');
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Open work orders: ${summarySnapshot.openWorkOrders}`);
    doc.text(`Overdue work orders: ${summarySnapshot.overdueWorkOrders}`);
    doc.text(`Completed work orders: ${summarySnapshot.completedWorkOrders}`);
    doc.text(`PM due next 7 days: ${summarySnapshot.pmDueNext7Days}`);
    doc.text(`Compliance score: ${summarySnapshot.complianceScore}%`);
    doc.text(`PM compliance: ${(summarySnapshot.summary.pmCompliance * 100).toFixed(1)}%`);
    doc.text(`Mean time to repair: ${summarySnapshot.summary.mttr.toFixed(1)} hours`);
    doc.text(`SLA compliance: ${summarySnapshot.summary.slaCompliance.toFixed(1)}%`);
    doc.text(
      `Asset availability: ${summarySnapshot.assetAvailability}% (Critical: ${summarySnapshot.assetAvailabilityCritical}%)`,
    );
    doc.text(`Active PM tasks: ${summarySnapshot.activePmTasks}`);
    doc.text(`Permits open: ${summarySnapshot.permitsOpen}`);
    doc.moveDown();

    doc.fontSize(14).text('Live pulse');
    doc.fontSize(11);
    doc.text(`Critical alerts: ${livePulse.criticalAlerts}`);
    doc.text(`Maintenance due (7d): ${livePulse.maintenanceDue}`);
    doc.text(`Compliance score: ${livePulse.complianceScore}%`);
    doc.text(`Technicians checked in: ${livePulse.techniciansCheckedIn}`);
    doc.text(`Permits awaiting approval: ${livePulse.permitsRequireApproval}`);
    doc.moveDown();

    doc.fontSize(14).text('Command center');
    doc.fontSize(11);
    doc.text(`Active work orders: ${commandCenter.activeWorkOrders}`);
    doc.text(`Overdue work orders: ${commandCenter.overdueWorkOrders}`);
    doc.text(`Open permits: ${commandCenter.openPermits}`);
    doc.text(`Technicians dispatched: ${commandCenter.techniciansDispatched}`);
    doc.moveDown();

    doc.fontSize(14).text('Analytics highlights');
    doc.fontSize(11);
    doc.text(`Completion rate (7d): ${analytics.completionRate}%`);
    doc.text(`Critical backlog: ${analytics.criticalBacklog}`);
    if (analytics.lastUpdatedAt) {
      doc.text(`Last update: ${analytics.lastUpdatedAt}`);
    }
    doc.moveDown();

    doc.fontSize(14).text('Work order performance');
    doc.fontSize(11);
    doc.text(`Active: ${workOrders.active}`);
    doc.text(`Completed today: ${workOrders.completedToday}`);
    doc.text(`On-time completion rate: ${workOrders.onTimeCompletionRate}%`);
    doc.moveDown();

    doc.fontSize(14).text('Permits and compliance');
    doc.fontSize(11);
    doc.text(`Permits requiring action: ${summarySnapshot.permitsOpen}`);
    doc.text(`Permits expiring within 7 days: ${permits.expiringSoon}`);
    doc.moveDown();

    doc.fontSize(14).text('Reports and imports');
    doc.fontSize(11);
    doc.text(`Reports completed this week: ${reports.generatedThisWeek}`);
    doc.text(`Scheduled reports: ${reports.scheduledReports}`);
    if (reports.lastExportAt) {
      doc.text(`Last report export: ${reports.lastExportAt}`);
    }
    if (imports.lastSync) {
      doc.text(`Last import sync: ${imports.lastSync}`);
    }
    doc.text(`Records processed: ${imports.processedItems}`);
    doc.text(`Import failures: ${imports.failed}`);
    doc.moveDown();

    doc.fontSize(10).fillColor('#475569').text('Generated by WorkPro3 CMMS', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
};

const postDashboardImportSync = async (req: Request, res: Response, next: NextFunction) => {
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

    const actorId = toObjectId(req.user?._id ?? req.user?.id ?? null);
    const actor = req.user
      ? { id: actorId, name: (req.user as any)?.name, email: (req.user as any)?.email }
      : undefined;
    await AuditLog.create({
      tenantId,
      userId: actorId,
      actor,
      action: 'import.sync',
      entityType: 'data-import',
      entityId: 'dashboard',
      entity: { type: 'data-import', id: 'dashboard', label: 'Dashboard Import' },
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

const postLaunchPlanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = resolveTenantId(req);
    if (tenantId) {
      const actorId = toObjectId(req.user?._id ?? req.user?.id ?? null);
      const actor = req.user
        ? { id: actorId, name: (req.user as any)?.name, email: (req.user as any)?.email }
        : undefined;
      await AuditLog.create({
        tenantId,
        userId: actorId,
        actor,
        action: 'planner.launch',
        entityType: 'command-center',
        entityId: 'planner',
        entity: { type: 'command-center', id: 'planner', label: 'Planner' },
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


export {
  getDashboardOverview,
  getDashboardLivePulse,
  getDashboardWorkOrders,
  getDashboardRecentActivity,
  getDashboardPermits,
  getDashboardExportPdf,
  postDashboardImportSync,
  postLaunchPlanner,
};
