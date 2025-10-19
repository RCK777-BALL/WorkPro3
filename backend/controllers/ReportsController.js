/*
 * SPDX-License-Identifier: MIT
 */

const PDFDocument = require('pdfkit');
const { Parser: Json2csvParser, Transform: Json2csvTransform } = require('json2csv');
const { Readable } = require('stream');

const toDefault = (mod) => (mod && mod.__esModule ? mod.default : mod);

const WorkOrder = toDefault(require('../models/WorkOrder'));
const Asset = toDefault(require('../models/Asset'));
const WorkHistory = toDefault(require('../models/WorkHistory'));
const User = toDefault(require('../models/User'));
const TimeSheet = toDefault(require('../models/TimeSheet'));
const { LABOR_RATE } = require('../config/env');
const sendResponse = toDefault(require('../utils/sendResponse'));

async function calculateStats(tenantId, role, workOrderType) {
  const roleFilter = role || 'tech';

  const baseFilter = {
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
  const pmBase = {
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
    .filter((value) => value !== undefined);

  const averageResponseTime = responseDurations.length
    ? responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
    : 0;

  const totalAssets = await Asset.countDocuments({ tenantId });
  const downAssets = await Asset.countDocuments({ status: { $ne: 'Active' }, tenantId });
  const assetUptime = totalAssets
    ? ((totalAssets - downAssets) / totalAssets) * 100
    : 0;
  const assetDowntime = totalAssets ? (downAssets / totalAssets) * 100 : 0;

  const laborAgg = await WorkHistory.aggregate([
    { $match: { tenantId } },
    { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
  ]);
  const totalLaborHours = (laborAgg[0] && laborAgg[0].hours) || 0;
  const userCount = await User.countDocuments({ tenantId, roles: roleFilter });
  const availableHours = userCount * 160;
  const laborUtilization = availableHours
    ? (totalLaborHours / availableHours) * 100
    : 0;

  const costPerWorkOrder = totalWorkOrders
    ? (totalLaborHours * LABOR_RATE) / totalWorkOrders
    : 0;

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

async function getAnalyticsReport(req, res, next) {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId;
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const stats = await calculateStats(tenantId, role, typeFilter);
    sendResponse(res, stats);
  } catch (err) {
    next(err);
  }
}

async function downloadReport(req, res, next) {
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId;
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
    Object.entries(stats).forEach(([k, v]) => {
      doc.fontSize(12).text(`${k}: ${v}`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
}

async function aggregateTrends(tenantId) {
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

async function getTrendData(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const data = await aggregateTrends(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
}

async function exportTrendData(req, res, next) {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const tenantId = req.tenantId;
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
  } catch (err) {
    next(err);
  }
}

async function aggregateCosts(tenantId) {
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

  const map = new Map();
  [labor, maintenance, materials].forEach((arr) => {
    arr.forEach((r) => {
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

async function getCostMetrics(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const data = await aggregateCosts(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
}

async function aggregateDowntime(tenantId) {
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

async function getDowntimeReport(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const data = await aggregateDowntime(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
}

async function aggregatePmCompliance(tenantId) {
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

async function getPmCompliance(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const data = await aggregatePmCompliance(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
}

async function aggregateCostByAsset(tenantId) {
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

async function getCostByAsset(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const data = await aggregateCostByAsset(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
};

module.exports.default = module.exports;
