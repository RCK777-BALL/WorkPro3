/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import TimeSheet from '../models/TimeSheet';

export interface AnalyticsSnapshot {
  mtbfHours: number;
  mttrHours: number;
  downtimeHours: number;
  pmCompliance: number;
  workOrderVolume: number;
  costPerAsset: number;
}

export async function buildAnalyticsSnapshot(tenantId: Types.ObjectId, siteId?: Types.ObjectId): Promise<AnalyticsSnapshot> {
  const scope: Record<string, any> = { tenantId };
  if (siteId) scope.siteId = siteId;

  const completed = await WorkOrder.find({ ...scope, status: 'completed' })
    .select('downtime completedAt createdAt type partsUsed')
    .lean();
  const durations = completed
    .map((wo) => {
      if (!wo.completedAt || !wo.createdAt) return 0;
      const ms = new Date(wo.completedAt).valueOf() - new Date(wo.createdAt).valueOf();
      return Math.max(0, ms / (1000 * 60 * 60));
    })
    .filter((v) => Number.isFinite(v));
  const mttr = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const downtime = completed.reduce((sum, wo) => sum + Number((wo as any).downtime ?? 0), 0);
  const pmCompleted = completed.filter((wo) => wo.type === 'preventive').length;
  const pmCompliance = completed.length ? Math.round((pmCompleted / completed.length) * 100) : 0;
  const workOrderVolume = await WorkOrder.countDocuments(scope);

  const costPerAsset = completed.reduce((sum, wo) => {
    const partsCost = Array.from((wo as any).partsUsed ?? []).reduce(
      (inner, part) => inner + Number((part as any).cost ?? 0),
      0,
    );
    return sum + partsCost;
  }, 0);

  const timeEntries = await TimeSheet.find(scope).select('durationMin').lean();
  const mtbf = timeEntries.length ? timeEntries.reduce((s, t) => s + Number((t as any).durationMin ?? 0), 0) : 0;

  return {
    mtbfHours: Number((mtbf / 60).toFixed(2)),
    mttrHours: Number(mttr.toFixed(2)),
    downtimeHours: Number(downtime.toFixed(2)),
    pmCompliance,
    workOrderVolume,
    costPerAsset: Number(costPerAsset.toFixed(2)),
  };
}
