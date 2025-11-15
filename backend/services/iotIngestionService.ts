/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, Types } from 'mongoose';

import SensorReading from '../models/SensorReading';
import ConditionRule from '../models/ConditionRule';
import WorkOrder from '../models/WorkOrder';
import Alert from '../models/Alert';
import Asset from '../models/Asset';

const ACTIVE_WORK_ORDER_STATUSES = ['requested', 'assigned', 'in_progress'];
const ANOMALY_LOOKBACK = 20;
const ANOMALY_COOLDOWN_MINUTES = 15;

export type IoTReadingInput = {
  assetId?: string;
  asset?: string;
  metric?: string;
  value?: number | string;
  timestamp?: string | Date;
};

export interface RuleTriggerResult {
  ruleId: string;
  workOrderId: string;
  created: boolean;
}

export interface AnomalyResult {
  alertId: string;
  assetId?: string;
  metric?: string;
  level: 'info' | 'warning' | 'critical';
}

export interface IngestSummary {
  savedCount: number;
  triggeredRules: RuleTriggerResult[];
  anomalies: AnomalyResult[];
}

const normalizeTimestamp = (value?: string | Date): Date => {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const normalizeValue = (value?: number | string): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const matchesRule = (value: number, operator: string, threshold: number): boolean => {
  switch (operator) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    default:
      return false;
  }
};

const createWorkOrderFromRule = async (
  rule: Awaited<ReturnType<typeof ConditionRule.findOne>>,
  tenantId: string,
  assetId: string,
  metric: string,
  value: number,
): Promise<RuleTriggerResult | null> => {
  if (!rule?._id) return null;
  const existing = await WorkOrder.findOne({
    tenantId,
    assetId,
    title: rule.workOrderTitle,
    status: { $in: ACTIVE_WORK_ORDER_STATUSES },
  })
    .select('_id')
    .lean();
  if (existing?._id) {
    return {
      ruleId: rule._id.toString(),
      workOrderId: existing._id.toString(),
      created: false,
    };
  }
  const created = await WorkOrder.create({
    tenantId,
    assetId,
    title: rule.workOrderTitle,
    description:
      rule.workOrderDescription ??
      `Auto-generated from ${metric} reading (${value.toFixed(2)})`,
    priority: 'high',
    type: 'corrective',
    status: 'requested',
  });
  return {
    ruleId: rule._id.toString(),
    workOrderId: created._id.toString(),
    created: true,
  };
};

const detectAnomaly = async (
  reading: (typeof SensorReading)['prototype'],
): Promise<AnomalyResult | null> => {
  if (!reading?.tenantId) return null;
  const tenantId = reading.tenantId.toString();
  const assetId = (reading.asset as Types.ObjectId | undefined)?.toString();
  if (!assetId) return null;

  const window = await SensorReading.find({
    tenantId,
    asset: reading.asset,
    metric: reading.metric,
  })
    .sort({ timestamp: -1 })
    .limit(ANOMALY_LOOKBACK)
    .lean();

  if (window.length < 5) return null;
  const values = window.map((entry) => entry.value ?? 0);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) {
    return null;
  }
  const zScore = Math.abs((reading.value - mean) / stdDev);
  if (!Number.isFinite(zScore) || zScore < 3) {
    return null;
  }

  const recentAlert = await Alert.findOne({
    tenantId,
    type: 'iot',
    asset: reading.asset,
    metric: reading.metric,
    createdAt: { $gte: new Date(Date.now() - ANOMALY_COOLDOWN_MINUTES * 60_000) },
  })
    .select('_id')
    .lean();
  if (recentAlert?._id) {
    return null;
  }

  const asset = await Asset.findById(reading.asset).lean();
  if (!asset?.plant) {
    return null;
  }

  const level: 'warning' | 'critical' = zScore >= 4 ? 'critical' : 'warning';
  const message = `${asset.name ?? 'Asset'} ${reading.metric} anomaly (${reading.value.toFixed(
    2,
  )})`;
  const alert = await Alert.create({
    tenantId,
    plant: asset.plant,
    asset: asset._id,
    metric: reading.metric,
    type: 'iot',
    level,
    message,
  });

  return {
    alertId: alert._id.toString(),
    assetId,
    metric: reading.metric,
    level,
  };
};

const sanitizeReadings = (readings: IoTReadingInput[]): {
  assetId: string;
  metric: string;
  value: number;
  timestamp: Date;
}[] => {
  return readings
    .map((reading) => {
      const assetId = reading.assetId ?? reading.asset;
      const metric = typeof reading.metric === 'string' ? reading.metric.trim() : '';
      const value = normalizeValue(reading.value);
      if (!assetId || !metric || value == null) {
        return null;
      }
      return {
        assetId,
        metric,
        value,
        timestamp: normalizeTimestamp(reading.timestamp),
      };
    })
    .filter((entry): entry is { assetId: string; metric: string; value: number; timestamp: Date } =>
      entry !== null,
    );
};

export async function ingestTelemetryBatch({
  tenantId,
  readings,
  source,
}: {
  tenantId: string;
  readings: IoTReadingInput[];
  source?: 'http' | 'mqtt';
}): Promise<IngestSummary> {
  void source; // reserved for future logging
  const sanitized = sanitizeReadings(readings);
  if (!sanitized.length) {
    throw new Error('No valid readings provided');
  }

  const docs = await SensorReading.insertMany(
    sanitized.map((entry) => ({
      asset: entry.assetId,
      metric: entry.metric,
      value: entry.value,
      timestamp: entry.timestamp,
      tenantId,
    })),
    { ordered: false },
  );

  const triggeredRules: RuleTriggerResult[] = [];
  const anomalies: AnomalyResult[] = [];

  const ruleCache = new Map<string, Awaited<ReturnType<typeof ConditionRule.find>>>();

  for (const doc of docs) {
    const assetId = (doc.asset as Types.ObjectId | undefined)?.toString();
    const metric = doc.metric;
    if (!assetId || !metric) continue;
    const cacheKey = `${tenantId}:${assetId}:${metric}`;
    if (!ruleCache.has(cacheKey)) {
      const query: FilterQuery<Record<string, unknown>> = {
        tenantId,
        asset: doc.asset,
        metric,
        active: true,
      };
      ruleCache.set(cacheKey, await ConditionRule.find(query).lean());
    }
    const rules = ruleCache.get(cacheKey) ?? [];
    for (const rule of rules) {
      if (
        rule?.threshold == null ||
        !matchesRule(doc.value, rule.operator ?? '>', rule.threshold)
      ) {
        continue;
      }
      const result = await createWorkOrderFromRule(
        rule as Awaited<ReturnType<typeof ConditionRule.findOne>>,
        tenantId,
        assetId,
        metric,
        doc.value,
      );
      if (result) {
        triggeredRules.push(result);
      }
    }
    const anomaly = await detectAnomaly(doc);
    if (anomaly) {
      anomalies.push(anomaly);
    }
  }

  return {
    savedCount: docs.length,
    triggeredRules,
    anomalies,
  };
}
