/*
 * SPDX-License-Identifier: MIT
 */

import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser, Transform as Json2csvTransform } from 'json2csv';
import { Readable } from 'stream';
import type { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import WorkHistory from '../models/WorkHistory';
import User from '../models/User';
import TimeSheet from '../models/TimeSheet';
import { LABOR_RATE } from '../config/env';
import { sendResponse } from '../utils/sendResponse';
import type { AuthedRequestHandler } from '../types/http';

interface AnalyticsStats {
  workOrderCompletionRate: number;
  averageResponseTime: number;
  maintenanceCompliance: number;
  assetUptime: number;
  costPerWorkOrder: number;
  laborUtilization: number;
  assetDowntime: number;
  topAssets: Array<{
    name: string;
    downtime: number;
    issues: number;
    cost: number;
  }>;
}

type TenantId = string | Types.ObjectId;

const calculateStats = async (
  tenantId: TenantId,
  role?: string,
  workOrderType?: string,
): Promise<AnalyticsStats> => {
  const roleFilter = role ?? 'tech';

  const baseFilter: Record<string, unknown> = {
    tenantId,
    ...(workOrderType ? { type: workOrderType } : {}),
  };

  const totalWorkOrders = await WorkOrder.countDocuments(baseFilter);
  const completedOrders = await WorkOrder.countDocuments({
    ...baseFilter,
    status: 'completed',
  });
  const workOrderCompletionRate = totalWorkOrders
    ? (completedOrders / totalWorkOrders) * 100
    : 0;

  const complianceType = workOrderType ?? 'preventive';
  const pmBase: Record<string, unknown> = {
    tenantId,
    type: complianceType,
  };
  const pmTotal = await WorkOrder.countDocuments(pmBase);
  const pmCompleted = await WorkOrder.countDocuments({
    ...pmBase,
    status: 'completed',
  });
  const maintenanceCompliance = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;

  const completed = await WorkOrder.find(
    { completedAt: { $exists: true }, ...baseFilter },
    {
      createdAt: 1,
      completedAt: 1,
    },
  );
  const responseDurations = completed
    .map((order) => {
      const createdAt = order.createdAt instanceof Date ? order.createdAt : undefined;
      const completedAt = order.completedAt instanceof Date ? order.completedAt : undefined;
      if (!createdAt || !completedAt) return undefined;
      return (completedAt.getTime() - createdAt.getTime()) / 36e5;
    })
    .filter((value): value is number => value !== undefined);

  const averageResponseTime = responseDurations.length
    ? responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
    : 0;

  const totalAssets = await Asset.countDocuments({ tenantId });
  const downAssets = await Asset.countDocuments({ status: { $ne: 'Active' }, tenantId });
  const assetUptime = totalAssets ? ((totalAssets - downAssets) / totalAssets) * 100 : 0;
  const assetDowntime = totalAssets ? (downAssets / totalAssets) * 100 : 0;

  const laborAgg = await WorkHistory.aggregate<{ hours?: number }>([
    { $match: { tenantId } },
    { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
  ]);
  const totalLaborHours = laborAgg[0]?.hours ?? 0;
  const userCount = await User.countDocuments({ tenantId, roles: roleFilter });
  const availableHours = userCount * 160;
  const laborUtilization = availableHours ? (totalLaborHours / availableHours) * 100 : 0;

  const costPerWorkOrder = totalWorkOrders ? (totalLaborHours * LABOR_RATE) / totalWorkOrders : 0;

  const topAssets = await WorkHistory.aggregate<{
    name: string;
    downtime: number;
    issues: number;
    cost: number;
  }>([
    { $match: { tenantId } },
    { $group: { _id: '$asset', downtime: { $sum: '$timeSpentHours' }, issues: { $sum: 1 } } },
    { $sort: { downtime: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'assets', localField: '_id', foreignField: '_id', as: 'asset' } },
    { $unwind: '$asset' },
    {
      $project: {
        _id: 0,
        name: '$asset.name',
        downtime: 1,
        issues: 1,
        cost: { $multiply: ['$downtime', LABOR_RATE] },
      },
    },
  ]);

  return {
    workOrderCompletionRate,
    averageResponseTime,
    maintenanceCompliance,
    assetUptime,
    costPerWorkOrder,
    laborUtilization,
    assetDowntime,
    topAssets,
  };
};

const getAnalyticsReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId as TenantId;
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const stats = await calculateStats(tenantId, role, typeFilter);
    sendResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

const downloadReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'pdf').toLowerCase();
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId as TenantId;
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const stats = await calculateStats(tenantId, role, typeFilter);

    if (format === 'csv') {
      const transform = new Json2csvTransform();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      Readable.from([stats]).pipe(transform).pipe(res);
      return;
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    Object.entries(stats).forEach(([key, value]) => {
      doc.fontSize(12).text(`${key}: ${value}`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

interface TrendDataPoint {
  period: string;
  maintenanceCost: number;
  assetDowntime: number;
}

const aggregateTrends = async (tenantId: TenantId): Promise<TrendDataPoint[]> => {
  const results = await WorkHistory.aggregate<{
    _id: string;
    maintenanceCost: number;
    assetDowntime: number;
  }>([
    { $match: { completedAt: { $exists: true }, tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', LABOR_RATE] } },
        assetDowntime: { $sum: '$timeSpentHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((result) => ({
    period: result._id,
    maintenanceCost: result.maintenanceCost,
    assetDowntime: result.assetDowntime,
  }));
};

const getTrendData: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId as TenantId;
    const data = await aggregateTrends(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const exportTrendData: AuthedRequestHandler = async (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'json').toLowerCase();
    const tenantId = req.tenantId as TenantId;
    const data = await aggregateTrends(tenantId);

    if (format === 'csv') {
      const parser = new Json2csvParser();
      const csv = parser.parse(data);
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('trends.csv');
      sendResponse(res, csv);
      return;
    }

    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface CostBreakdown {
  period: string;
  laborCost: number;
  maintenanceCost: number;
  materialCost: number;
  totalCost: number;
}

const aggregateCosts = async (tenantId: TenantId): Promise<CostBreakdown[]> => {
  const labor = await TimeSheet.aggregate<{
    period: string;
    laborCost: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        hours: { $sum: '$totalHours' },
      },
    },
    {
      $project: { _id: 0, period: '$_id', laborCost: { $multiply: ['$hours', LABOR_RATE] } },
    },
  ]);

  const maintenance = await WorkHistory.aggregate<{
    period: string;
    maintenanceCost: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', LABOR_RATE] } },
      },
    },
    { $project: { _id: 0, period: '$_id', maintenanceCost: 1 } },
  ]);

  const materials = await WorkHistory.aggregate<{
    period: string;
    materialCost: number;
  }>([
    { $match: { tenantId } },
    { $unwind: '$materialsUsed' },
    {
      $lookup: {
        from: 'inventories',
        localField: 'materialsUsed',
        foreignField: '_id',
        as: 'inv',
      },
    },
    { $unwind: '$inv' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        materialCost: { $sum: '$inv.unitCost' },
      },
    },
    { $project: { _id: 0, period: '$_id', materialCost: 1 } },
  ]);

  const map = new Map<string, CostBreakdown>();

  const upsert = (entry: Partial<CostBreakdown> & { period: string }) => {
    const existing = map.get(entry.period) ?? {
      period: entry.period,
      laborCost: 0,
      maintenanceCost: 0,
      materialCost: 0,
      totalCost: 0,
    };
    if (entry.laborCost !== undefined) existing.laborCost = entry.laborCost;
    if (entry.maintenanceCost !== undefined) existing.maintenanceCost = entry.maintenanceCost;
    if (entry.materialCost !== undefined) existing.materialCost = entry.materialCost;
    existing.totalCost =
      existing.laborCost +
      existing.maintenanceCost +
      existing.materialCost;
    map.set(entry.period, existing);
  };

  labor.forEach((item) => upsert(item));
  maintenance.forEach((item) => upsert(item));
  materials.forEach((item) => upsert(item));

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
};

const getCostMetrics: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId as TenantId;
    const data = await aggregateCosts(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface DowntimePoint {
  period: string;
  downtime: number;
}

const aggregateDowntime = async (tenantId: TenantId): Promise<DowntimePoint[]> => {
  const results = await WorkHistory.aggregate<{
    _id: string;
    downtime: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        downtime: { $sum: '$timeSpentHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((result) => ({ period: result._id, downtime: result.downtime }));
};

const getDowntimeReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId as TenantId;
    const data = await aggregateDowntime(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface PmCompliancePoint {
  period: string;
  compliance: number;
}

const aggregatePmCompliance = async (tenantId: TenantId): Promise<PmCompliancePoint[]> => {
  const results = await WorkOrder.aggregate<PmCompliancePoint>([
    { $match: { tenantId, type: 'preventive' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$scheduledDate' } },
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: '$_id',
        compliance: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
          ],
        },
      },
    },
  ]);

  return results;
};

const getPmCompliance: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId as TenantId;
    const data = await aggregatePmCompliance(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface CostByAssetPoint {
  asset: string;
  cost: number;
}

const aggregateCostByAsset = async (tenantId: TenantId): Promise<CostByAssetPoint[]> => {
  const results = await WorkHistory.aggregate<CostByAssetPoint>([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$asset',
        hours: { $sum: '$timeSpentHours' },
      },
    },
    {
      $lookup: {
        from: 'assets',
        localField: '_id',
        foreignField: '_id',
        as: 'asset',
      },
    },
    { $unwind: '$asset' },
    {
      $project: {
        _id: 0,
        asset: '$asset.name',
        cost: { $multiply: ['$hours', LABOR_RATE] },
      },
    },
    { $sort: { cost: -1 } },
  ]);

  return results;
};

const getCostByAsset: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId as TenantId;
    const data = await aggregateCostByAsset(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
};
