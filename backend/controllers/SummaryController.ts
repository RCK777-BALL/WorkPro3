/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import type { AuthedRequestHandler } from '../types/http';

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

export const getSummary: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const [assetCount, workOrderCount, inventoryCount] = await Promise.all([
      Asset.countDocuments(match),
      WorkOrder.countDocuments(match),
      InventoryItem.countDocuments(match),
    ]);

    res.json({
      totals: {
        assets: assetCount,
        workOrders: workOrderCount,
        pmCompliance: 0,
      },
      metrics: { inventoryItems: inventoryCount },
    });
    return;
  } catch (err) {
    return next(err);
  }
};

export const getAssetSummary: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await Asset.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(summary);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getWorkOrderSummary: AuthedRequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = getTenantId(req);
    const match = tenantId ? { tenantId } : {};
    const summary = await WorkOrder.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(summary);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getUpcomingMaintenance: AuthedRequestHandler = async (
  req,
  res,
  next,
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
    res.json(tasks);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getCriticalAlerts: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const match: any = tenantId ? { tenantId } : {};
    match.priority = 'critical';
    match.status = { $ne: 'completed' };
    const alerts = await WorkOrder.find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('asset');
    res.json(alerts);
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

