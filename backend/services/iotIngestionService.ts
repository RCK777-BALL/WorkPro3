/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, Types } from 'mongoose';

import SensorReading from '../models/SensorReading';
import ConditionRule from '../models/ConditionRule';
import WorkOrder from '../models/WorkOrder';
import Alert from '../models/Alert';
import Asset from '../models/Asset';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import PMTask from '../models/PMTask';

const ACTIVE_WORK_ORDER_STATUSES = ['requested', 'assigned', 'in_progress'];
const ANOMALY_LOOKBACK = 20;
const ANOMALY_COOLDOWN_MINUTES = 15;

type ConditionRuleLean = {
  _id?: Types.ObjectId;
  asset?: Types.ObjectId;
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==';
  threshold?: number;
  workOrderTitle?: string;
  workOrderDescription?: string;
};

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
  meterUpdates?: MeterUpdateResult[];
  meterPmWorkOrders?: MeterPmTriggerResult[];
}

export interface MeterUpdateResult {
  meterId: string;
  value: number;
  readingId?: string;
}

export interface MeterPmTriggerResult {
  pmTaskId: string;
  meterId: string;
  workOrderId: string;
  triggeredAt: string;
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
  rule: ConditionRuleLean | null,
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

const triggerMeterPmFromMeter = async (
  meter: (typeof Meter)['prototype'],
  observedAt: Date,
): Promise<MeterPmTriggerResult[]> => {
  const pmTasks = await PMTask.find({
    tenantId: meter.tenantId,
    active: true,
    'rule.type': 'meter',
    'rule.meterName': meter.name,
  });

  const results: MeterPmTriggerResult[] = [];

  for (const task of pmTasks) {
    const threshold = task.rule?.threshold ?? meter.pmInterval ?? 0;
    const delta = meter.currentValue - (meter.lastWOValue || 0);
    if (!Number.isFinite(threshold) || threshold <= 0 || delta < threshold) {
      continue;
    }

    const workOrder = await WorkOrder.create({
      title: `Meter PM: ${task.title}`,
      description: task.notes || '',
      status: 'open',
      asset: meter.asset,
      pmTask: task._id,
      department: task.department,
      dueDate: observedAt,
      priority: 'medium',
      tenantId: task.tenantId,
    });

    meter.lastWOValue = meter.currentValue;
    task.lastGeneratedAt = observedAt;
    await task.save();

    results.push({
      pmTaskId: task._id.toString(),
      meterId: meter._id.toString(),
      workOrderId: workOrder._id.toString(),
      triggeredAt: observedAt.toISOString(),
    });
  }

  if (results.length > 0) {
    await meter.save();
  }

  return results;
};

export async function ingestTelemetryBatch({
  tenantId,
  readings,
  source,
  triggerMeterPm,
}: {
  tenantId: string;
  readings: IoTReadingInput[];
  source?: 'http' | 'mqtt';
  triggerMeterPm?: boolean;
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
  const meterUpdates: MeterUpdateResult[] = [];
  const meterPmWorkOrders: MeterPmTriggerResult[] = [];

  const ruleCache = new Map<string, ConditionRuleLean[]>();

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
      ruleCache.set(
        cacheKey,
        (await ConditionRule.find(query).lean()) as ConditionRuleLean[],
      );
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
        rule,
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

  if (triggerMeterPm) {
    const latestByMeter = new Map<
      string,
      { assetId: string; metric: string; value: number; timestamp: Date }
    >();

    for (const reading of sanitized) {
      const key = `${reading.assetId}:${reading.metric}`;
      const current = latestByMeter.get(key);
      if (!current || current.timestamp < reading.timestamp) {
        latestByMeter.set(key, reading);
      }
    }

    for (const reading of latestByMeter.values()) {
      const meter = await Meter.findOne({
        tenantId,
        asset: reading.assetId,
        name: reading.metric,
      });

      if (!meter) continue;

      const meterReading = await MeterReading.create({
        meter: meter._id,
        value: reading.value,
        timestamp: reading.timestamp,
        tenantId,
      });

      meter.currentValue = reading.value;
      await meter.save();

      meterUpdates.push({
        meterId: meter._id.toString(),
        value: reading.value,
        readingId: meterReading._id.toString(),
      });

      const pmTriggers = await triggerMeterPmFromMeter(meter, reading.timestamp);
      meterPmWorkOrders.push(...pmTriggers);
    }
  }

  return {
    savedCount: docs.length,
    triggeredRules,
    anomalies,
    ...(meterUpdates.length ? { meterUpdates } : {}),
    ...(meterPmWorkOrders.length ? { meterPmWorkOrders } : {}),
  };
}
