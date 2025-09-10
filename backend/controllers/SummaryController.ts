import { Request, Response, NextFunction } from 'express';

import Asset from '../models/Asset';
import WorkOrder from '../models/WorkOrder';
import InventoryItem from '../models/InventoryItem';

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

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const [assetCount, workOrderCount, inventoryCount] = await Promise.all([
      Asset.countDocuments(match),
      WorkOrder.countDocuments(match),
      InventoryItem.countDocuments(match),
    ]);

    return res.json({
      totals: {
        assets: assetCount,
        workOrders: workOrderCount,
        pmCompliance: 0,
      },
      metrics: { inventoryItems: inventoryCount },
    });
  } catch (err) {
    return next(err);
  }
};

export const getAssetSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await Asset.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
};

export const getWorkOrderSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await WorkOrder.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
};

export const getUpcomingMaintenance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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
    return res.json(tasks);
  } catch (err) {
    return next(err);
  }
};

export const getCriticalAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const match: any = tenantId ? { tenantId } : {};
    match.priority = 'critical';
    match.status = { $ne: 'completed' };
    const alerts = await WorkOrder.find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('asset');
    return res.json(alerts);
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

