/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import type { PmCompletionPoint, PmCompletionResponse, PmCompletionSummary } from '../shared/pmAnalytics';

type PmAnalyticsOptions = {
  months?: number;
  siteId?: Types.ObjectId;
};

const clampMonths = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 6;
  const normalized = Math.trunc(value as number);
  return Math.min(Math.max(normalized, 1), 24);
};

const formatPeriod = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const createPeriodBuckets = (months: number, now: Date): Map<string, PmCompletionPoint> => {
  const buckets = new Map<string, PmCompletionPoint>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const period = formatPeriod(date);
    buckets.set(period, {
      period,
      onTime: 0,
      late: 0,
      missed: 0,
      total: 0,
      completionRate: 0,
    });
  }
  return buckets;
};

const summarizeBuckets = (trend: PmCompletionPoint[]): PmCompletionSummary => {
  const totals = trend.reduce<PmCompletionSummary>(
    (acc, point) => ({
      onTime: acc.onTime + point.onTime,
      late: acc.late + point.late,
      missed: acc.missed + point.missed,
      total: acc.total + point.total,
      completionRate: 0,
    }),
    { onTime: 0, late: 0, missed: 0, total: 0, completionRate: 0 },
  );

  const completed = totals.onTime + totals.late;
  totals.completionRate = totals.total ? Number(((completed / totals.total) * 100).toFixed(1)) : 0;

  return totals;
};

export async function buildPmCompletionAnalytics(
  tenantId: Types.ObjectId,
  options?: PmAnalyticsOptions,
): Promise<PmCompletionResponse> {
  const now = new Date();
  const months = clampMonths(options?.months);
  const periodBuckets = createPeriodBuckets(months, now);

  const oldestPeriod = Array.from(periodBuckets.keys())[0];
  const [oldestYear, oldestMonth] = oldestPeriod.split('-').map((value) => Number(value));
  const windowStart = new Date(Date.UTC(oldestYear, (oldestMonth ?? 1) - 1, 1));

  const match: Record<string, unknown> = {
    tenantId,
    type: 'preventive',
    dueDate: { $gte: windowStart },
  };

  if (options?.siteId) {
    match.siteId = options.siteId;
  }

  const workOrders = await WorkOrder.find(match)
    .select('dueDate completedAt status')
    .lean();

  workOrders.forEach((workOrder) => {
    if (!workOrder.dueDate) return;

    const dueDate = new Date(workOrder.dueDate);
    const period = formatPeriod(dueDate);
    const bucket = periodBuckets.get(period);
    if (!bucket) return;

    const completedAt = workOrder.completedAt ? new Date(workOrder.completedAt) : null;
    const isCompleted = workOrder.status === 'completed' && completedAt;

    if (!isCompleted && dueDate > now) {
      return;
    }

    bucket.total += 1;

    if (isCompleted && completedAt && completedAt <= dueDate) {
      bucket.onTime += 1;
    } else if (isCompleted) {
      bucket.late += 1;
    } else if (dueDate < now) {
      bucket.missed += 1;
    }
  });

  const trend = Array.from(periodBuckets.values()).map((point) => {
    const completed = point.onTime + point.late;
    const completionRate = point.total ? Number(((completed / point.total) * 100).toFixed(1)) : 0;
    return { ...point, completionRate };
  });

  const totals = summarizeBuckets(trend);

  return { trend, totals };
}
