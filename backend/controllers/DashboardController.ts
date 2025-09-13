/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import Asset from '../models/Asset';
import WorkOrder from '../models/WorkOrder';
import PMTask from '../models/PMTask';
import InventoryItem from '../models/InventoryItem';
import { nextCronOccurrenceWithin } from '../services/PMScheduler';

export const getAssetSummaries = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await Asset.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

export const getWorkOrderStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await WorkOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

export const getUpcomingMaintenance = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const tasks = await PMTask.find({ active: true }).populate('asset');
    const upcoming = tasks.filter((t) => {
      if (t.rule?.type !== 'calendar' || !t.rule.cron) return false;
      return !!nextCronOccurrenceWithin(t.rule.cron, now, 7);
    });

    res.json(upcoming);
  } catch (err) {
    next(err);
  }
};

export const getCriticalAlerts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await WorkOrder.find({
      priority: 'critical',
      status: { $ne: 'completed' },
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

export const getLowStockInventory = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryItem.find({
      $expr: { $lte: ['$quantity', '$reorderThreshold'] },
    }).populate('vendor');
    res.json(items);
  } catch (err) {
    next(err);
  }
};
