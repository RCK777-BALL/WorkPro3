/*
 * SPDX-License-Identifier: MIT
 */

/// <reference types="node" />

import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser, Transform as Json2csvTransform } from 'json2csv';
import { Readable } from 'stream';
import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import WorkHistory from '../models/WorkHistory';
import User from '../models/User';
import TimeSheet from '../models/TimeSheet';
import type { AuthedRequestHandler } from '../types/http';
import { LABOR_RATE } from '../config/env';
import { sendResponse } from '../utils/sendResponse';
 

async function calculateStats(tenantId: string, role?: string) {
  const roleFilter = role || 'tech';

  // Work order completion
  const totalWorkOrders = await WorkOrder.countDocuments({ tenantId });
  const completedOrders = await WorkOrder.countDocuments({ status: 'completed', tenantId });
  const workOrderCompletionRate = totalWorkOrders
    ? (completedOrders / totalWorkOrders) * 100
    : 0;

  // Preventive maintenance completion
  const pmTotal = await WorkOrder.countDocuments({ type: 'preventive', tenantId });
  const pmCompleted = await WorkOrder.countDocuments({
    type: 'preventive',
    status: 'completed',
    tenantId,
  });
  const maintenanceCompliance = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;

  // Average response time for completed orders (hours)
  const completed = await WorkOrder.find(
    { completedAt: { $exists: true }, tenantId },
    {
      createdAt: 1,
      completedAt: 1,
    },
  );
  const averageResponseTime = completed.length
    ?
        completed.reduce((sum, o) => {
          const diff =
            (o.completedAt!.getTime() - o.createdAt.getTime()) / 36e5; // ms to hours
          return sum + diff;
        }, 0) / completed.length
    : 0;

  // Asset uptime/downtime
  const totalAssets = await Asset.countDocuments({ tenantId });
  const downAssets = await Asset.countDocuments({ status: { $ne: 'Active' }, tenantId });
  const assetUptime = totalAssets
    ? ((totalAssets - downAssets) / totalAssets) * 100
    : 0;
  const assetDowntime = totalAssets ? (downAssets / totalAssets) * 100 : 0;

  // Labor utilization from work history hours
  const laborAgg = await WorkHistory.aggregate([
    { $match: { tenantId } },
    { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
  ]);
  const totalLaborHours = laborAgg[0]?.hours || 0;
  const userCount = await User.countDocuments({ tenantId, roles: roleFilter });
  const availableHours = userCount * 160; // approx hours per month
  const laborUtilization = availableHours
    ? (totalLaborHours / availableHours) * 100
    : 0;

  // Average cost per work order based on hourly labor rate
  const costPerWorkOrder = totalWorkOrders
    ? (totalLaborHours * LABOR_RATE) / totalWorkOrders
    : 0;

  // Top assets by downtime
  const topAssets = await WorkHistory.aggregate([
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
}

export const getAnalyticsReport: AuthedRequestHandler = async (req: { query: { role: any; }; tenantId: any; }, res: { json: (arg0: { workOrderCompletionRate: number; averageResponseTime: number; maintenanceCompliance: number; assetUptime: number; costPerWorkOrder: number; laborUtilization: number; assetDowntime: number; topAssets: any[]; }) => void; }, next: (arg0: unknown) => any) => {
 
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId!;
    const stats = await calculateStats(tenantId, role);
    sendResponse(res, stats);
    return;
  } catch (err) {
    return next(err);
  }
};

export const downloadReport: AuthedRequestHandler = async (req, res, next) => {
 
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId!;
    const stats = await calculateStats(tenantId, role);

    if (format === 'csv') {
      const transform = new Json2csvTransform();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      Readable.from([stats]).pipe(transform).pipe(
        res as unknown as NodeJS.WritableStream,
      );
      return;
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    Object.entries(stats).forEach(([k, v]) => {
      doc.fontSize(12).text(`${k}: ${v}`);
    });
    doc.end();
  } catch (err) {
    return next(err);
  }
};

async function aggregateTrends(tenantId: string) {
  const results = await WorkHistory.aggregate([
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

  return results.map((r) => ({
    period: r._id,
    maintenanceCost: r.maintenanceCost,
    assetDowntime: r.assetDowntime,
  }));
}

export const getTrendData: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: { period: any; maintenanceCost: any; assetDowntime: any; }[]) => void; }, next: (arg0: unknown) => any) => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateTrends(tenantId);
    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};

export const exportTrendData: AuthedRequestHandler = async (req: { query: { format: any; }; tenantId: any; }, res: { header: (arg0: string, arg1: string) => void; attachment: (arg0: string) => void; send: (arg0: string) => void; json: (arg0: { period: any; maintenanceCost: any; assetDowntime: any; }[]) => void; }, next: (arg0: unknown) => any) => {
 
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const tenantId = req.tenantId!;
    const data = await aggregateTrends(tenantId);

    if (format === 'csv') {
      const parser = new Json2csvParser();
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('trends.csv');
      sendResponse(res, csv);
      return;
    }

    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};

async function aggregateCosts(tenantId: string) {
  const labor = await TimeSheet.aggregate([
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

  const maintenance = await WorkHistory.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', LABOR_RATE] } },
      },
    },
    { $project: { _id: 0, period: '$_id', maintenanceCost: 1 } },
  ]);

  const materials = await WorkHistory.aggregate([
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

  const map = new Map<string, any>();
  [labor, maintenance, materials].forEach((arr) => {
    arr.forEach((r: any) => {
      const entry = map.get(r.period) || {
        period: r.period,
        laborCost: 0,
        maintenanceCost: 0,
        materialCost: 0,
      };
      if (r.laborCost !== undefined) entry.laborCost = r.laborCost;
      if (r.maintenanceCost !== undefined) entry.maintenanceCost = r.maintenanceCost;
      if (r.materialCost !== undefined) entry.materialCost = r.materialCost;
      map.set(r.period, entry);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => ({
      ...r,
      totalCost:
        (r.laborCost || 0) +
        (r.maintenanceCost || 0) +
        (r.materialCost || 0),
    }));
}

export const getCostMetrics: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: any[]) => void; }, next: (arg0: unknown) => any) => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateCosts(tenantId);
    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};

async function aggregateDowntime(tenantId: string) {
  const results = await WorkHistory.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        downtime: { $sum: '$timeSpentHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({ period: r._id, downtime: r.downtime }));
}

export const getDowntimeReport: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: { period: any; downtime: any; }[]) => void; }, next: (arg0: unknown) => any) => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateDowntime(tenantId);
    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};

async function aggregatePmCompliance(tenantId: string) {
  const results = await WorkOrder.aggregate([
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
}

export const getPmCompliance: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: any[]) => void; }, next: (arg0: unknown) => any) => {
  try {
    const tenantId = req.tenantId!;
    const data = await aggregatePmCompliance(tenantId);
    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};

async function aggregateCostByAsset(tenantId: string) {
  const results = await WorkHistory.aggregate([
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
}

export const getCostByAsset: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: any[]) => void; }, next: (arg0: unknown) => any) => {
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateCostByAsset(tenantId);
    sendResponse(res, data);
    return;
  } catch (err) {
    return next(err);
  }
};
