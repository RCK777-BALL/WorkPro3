/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, Types } from 'mongoose';
import DowntimeLog from '../../../models/DowntimeLog';
import WorkOrder from '../../../models/WorkOrder';

export interface TimeWindow {
  start?: Date;
  end?: Date;
  assetIds?: string[];
}

const buildDateRange = (field: string, window: TimeWindow): Record<string, unknown> => {
  const range: Record<string, unknown> = {};
  if (window.start) range.$gte = window.start;
  if (window.end) range.$lte = window.end;
  return Object.keys(range).length ? { [field]: range } : {};
};

const applyAssetFilter = (window: TimeWindow): Record<string, unknown> =>
  window.assetIds && window.assetIds.length ? { assetId: { $in: window.assetIds } } : {};

export const calculateReliabilityMetrics = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ mttrHours: number; mtbfHours: number; eventCount: number }> => {
  const filter: FilterQuery<typeof DowntimeLog> = {
    tenantId,
    ...applyAssetFilter(window),
    ...buildDateRange('start', window),
  } as FilterQuery<typeof DowntimeLog>;

  const events = await DowntimeLog.find(filter).sort({ start: 1 }).lean().exec();

  if (!events.length) return { mttrHours: 0, mtbfHours: 0, eventCount: 0 };

  const durations = events.map((event) => {
    const end = event.end ? new Date(event.end) : new Date();
    return Math.max(0, (end.getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60));
  });

  const mttrHours = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;

  const totalSpanHours =
    events.length > 1
      ? (new Date(events[events.length - 1].start).getTime() - new Date(events[0].start).getTime()) /
        (1000 * 60 * 60)
      : durations[0];
  const mtbfHours = events.length > 1 ? totalSpanHours / (events.length - 1) : totalSpanHours;

  return { mttrHours, mtbfHours, eventCount: events.length };
};

export const calculateBacklogMetrics = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ size: number; averageAgeDays: number }> => {
  const statusFilter: FilterQuery<typeof WorkOrder> = { status: { $nin: ['completed', 'cancelled'] } };

  const filter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    ...statusFilter,
    ...applyAssetFilter(window),
    ...buildDateRange('createdAt', window),
  } as FilterQuery<typeof WorkOrder>;

  const workOrders = await WorkOrder.find(filter).select('createdAt').lean().exec();
  if (!workOrders.length) return { size: 0, averageAgeDays: 0 };

  const now = window.end ?? new Date();
  const ages = workOrders.map((wo) => {
    const created = wo.createdAt ? new Date(wo.createdAt) : now;
    return Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  });

  const averageAgeDays = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return { size: workOrders.length, averageAgeDays };
};

export const calculatePmCompliance = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ total: number; completed: number; complianceRate: number }> => {
  const baseFilter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    type: 'preventive',
    ...applyAssetFilter(window),
    ...buildDateRange('createdAt', window),
  } as FilterQuery<typeof WorkOrder>;

  const [total, completed] = await Promise.all([
    WorkOrder.countDocuments(baseFilter),
    WorkOrder.countDocuments({ ...baseFilter, status: 'completed' }),
  ]);

  const complianceRate = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, complianceRate };
};
