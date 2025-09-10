import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser } from 'json2csv';
import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import WorkHistory from '../models/WorkHistory';
import User from '../models/User';
import TimeSheet from '../models/TimeSheet';
import Inventory from '../models/Inventory';
import { Request, Response, NextFunction } from 'express';

async function calculateStats(tenantId: string, role?: string) {
  const roleFilter = role || 'technician';

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
  const userCount = await User.countDocuments({ tenantId, role: roleFilter });
  const availableHours = userCount * 160; // approx hours per month
  const laborUtilization = availableHours
    ? (totalLaborHours / availableHours) * 100
    : 0;

  // Average cost per work order (assume $50 per hour)
  const costPerWorkOrder = totalWorkOrders
    ? (totalLaborHours * 50) / totalWorkOrders
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
        cost: { $multiply: ['$downtime', 50] },
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

 export const getAnalyticsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId!;
    const stats = await calculateStats(tenantId, role);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

 export const downloadReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = req.tenantId!;
    const stats = await calculateStats(tenantId, role);

    if (format === 'csv') {
      const parser = new Json2csvParser();
      const csv = parser.parse([stats]);
      res.header('Content-Type', 'text/csv');
      res.attachment('report.csv');
      return res.send(csv);
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
};

async function aggregateTrends(tenantId: string) {
  const results = await WorkHistory.aggregate([
    { $match: { completedAt: { $exists: true }, tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', 50] } },
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

 export const getTrendData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateTrends(tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

 export const exportTrendData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const tenantId = req.tenantId!;
    const data = await aggregateTrends(tenantId);

    if (format === 'csv') {
      const parser = new Json2csvParser();
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('trends.csv');
      return res.send(csv);
    }

    res.json(data);
  } catch (err) {
    next(err);
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
      $project: { _id: 0, period: '$_id', laborCost: { $multiply: ['$hours', 50] } },
    },
  ]);

  const maintenance = await WorkHistory.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', 50] } },
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

 export const getCostMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateCosts(tenantId);
    res.json(data);
  } catch (err) {
    next(err);
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

 export const getDowntimeMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const tenantId = req.tenantId!;
    const data = await aggregateDowntime(tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
