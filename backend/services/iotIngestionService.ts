/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

import SensorReading from '../models/SensorReading';
import ConditionRule from '../models/ConditionRule';
import WorkOrder from '../models/WorkOrder';
import Alert from '../models/Alert';
import Asset from '../models/Asset';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import PMTask from '../models/PMTask';
import SensorDevice from '../models/SensorDevice';
import PMTemplate from '../models/PMTemplate';
import IoTTriggerConfig from '../models/IoTTriggerConfig';
import IoTEvent from '../models/IoTEvent';
import { resolveProcedureChecklist } from './procedureTemplateService';

const ACTIVE_WORK_ORDER_STATUSES = ['requested', 'assigned', 'in_progress'];
const ANOMALY_LOOKBACK = 20;
const ANOMALY_COOLDOWN_MINUTES = 15;

export type ConditionRuleLean = {
  _id?: Types.ObjectId;
  asset?: Types.ObjectId;
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==';
  threshold?: number;
  workOrderTitle?: string;
  workOrderDescription?: string;
  pmTemplateId?: Types.ObjectId;
};

export type IoTTriggerConfigLean = {
  _id?: Types.ObjectId;
  asset?: Types.ObjectId;
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==';
  threshold?: number;
  procedureTemplateId?: Types.ObjectId;
  cooldownMinutes?: number;
  lastTriggeredAt?: Date;
};

type TemplateAssignmentLean = {
  asset?: Types.ObjectId;
  checklist?: { description: string; required?: boolean }[];
  requiredParts?: { partId?: Types.ObjectId; quantity?: number }[];
};

type TemplateLean = {
  _id?: Types.ObjectId;
  name?: string;
  description?: string;
  tasks?: string[];
  assignments?: TemplateAssignmentLean[];
};

export type IoTReadingInput = {
  assetId?: string;
  asset?: string;
  deviceId?: string;
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
  deviceUpdates?: DeviceUpdateResult[];
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

export interface DeviceUpdateResult {
  deviceId: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeenAt?: string;
  assetId?: string;
  metric?: string;
  value?: number;
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
  context?: {
    source?: 'http' | 'mqtt';
    readingId?: Types.ObjectId;
    timestamp?: Date;
    payload?: SanitizedReading;
    template?: TemplateLean | null;
  },
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

  const template = context?.template ?? null;
  const assignment = template?.assignments?.find(
    (item) => (item.asset as Types.ObjectId | undefined)?.toString() === assetId,
  );
  const title =
    rule.workOrderTitle ??
    (template?.name ? `PM: ${template.name}` : `Auto-generated from ${metric}`);
  const description =
    rule.workOrderDescription ??
    template?.description ??
    (template?.tasks?.length ? template.tasks.join('\n') : undefined) ??
    `Auto-generated from ${metric} reading (${value.toFixed(2)})`;
  const checklists = assignment?.checklist?.map((item) => ({
    text: item.description,
    done: false,
    required: item.required ?? true,
  }));
  const partsUsed = assignment?.requiredParts?.map((part) => ({
    partId: part.partId,
    qty: part.quantity ?? 1,
    cost: 0,
  }));

  const created = await WorkOrder.create({
    tenantId,
    assetId,
    title,
    description,
    priority: 'high',
    type: template ? 'preventive' : 'corrective',
    status: 'requested',
    ...(template?._id ? { pmTemplate: template._id } : {}),
    ...(checklists?.length ? { checklists } : {}),
    ...(partsUsed?.length ? { partsUsed } : {}),
    iotEvent: {
      ruleId: rule._id,
      source: context?.source,
      readingId: context?.readingId,
      metric,
      value,
      timestamp: context?.timestamp ?? new Date(),
      payload: context?.payload
        ? {
            assetId: context.payload.assetId,
            metric: context.payload.metric,
            value: context.payload.value,
            timestamp: context.payload.timestamp?.toISOString?.() ?? context.payload.timestamp,
            ...(context.payload.deviceId ? { deviceId: context.payload.deviceId } : {}),
          }
        : undefined,
    },
  });
  return {
    ruleId: rule._id.toString(),
    workOrderId: created._id.toString(),
    created: true,
  };
};

const createWorkOrderFromTrigger = async (
  trigger: IoTTriggerConfigLean | null,
  tenantId: string,
  assetId: string,
  metric: string,
  value: number,
  context?: {
    source?: 'http' | 'mqtt';
    readingId?: Types.ObjectId;
    timestamp?: Date;
    payload?: SanitizedReading;
  },
): Promise<RuleTriggerResult | null> => {
  if (!trigger?._id || !trigger.procedureTemplateId) return null;
  const existing = await WorkOrder.findOne({
    tenantId,
    assetId,
    status: { $in: ACTIVE_WORK_ORDER_STATUSES },
    procedureTemplateId: trigger.procedureTemplateId,
  })
    .select('_id')
    .lean();
  if (existing?._id) {
    return {
      ruleId: trigger._id.toString(),
      workOrderId: existing._id.toString(),
      created: false,
    };
  }

  const { snapshot, checklist } = await resolveProcedureChecklist(tenantId, trigger.procedureTemplateId);
  if (!snapshot || !checklist) return null;

  const partsUsed = (snapshot.requiredParts ?? []).map((part) => ({
    partId: part.partId,
    qty: part.quantity,
    cost: 0,
  }));

  const created = await WorkOrder.create({
    tenantId,
    assetId,
    title: `IoT-triggered PM`,
    description: `Auto-generated from ${metric} reading (${value.toFixed(2)})`,
    priority: 'high',
    type: 'preventive',
    status: 'requested',
    checklist,
    ...(snapshot ? { procedureTemplateId: snapshot.templateId, procedureTemplateVersionId: snapshot.versionId } : {}),
    ...(partsUsed.length ? { partsUsed } : {}),
    iotEvent: {
      triggerId: trigger._id,
      source: context?.source,
      readingId: context?.readingId,
      metric,
      value,
      timestamp: context?.timestamp ?? new Date(),
      payload: context?.payload
        ? {
            assetId: context.payload.assetId,
            metric: context.payload.metric,
            value: context.payload.value,
            timestamp: context.payload.timestamp?.toISOString?.() ?? context.payload.timestamp,
            ...(context.payload.deviceId ? { deviceId: context.payload.deviceId } : {}),
          }
        : undefined,
    },
  });

  await IoTEvent.create({
    tenantId,
    triggerId: trigger._id,
    workOrderId: created._id,
    asset: created.assetId,
    metric,
    value,
    triggeredAt: context?.timestamp ?? new Date(),
    payload: context?.payload ? { ...context.payload } : undefined,
  });

  return {
    ruleId: trigger._id.toString(),
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

type SanitizedReading = {
  assetId: string;
  metric: string;
  value: number;
  timestamp: Date;
  deviceId?: string;
};

const sanitizeReadings = async (
  tenantId: string,
  readings: IoTReadingInput[],
): Promise<SanitizedReading[]> => {
  const deviceIds = Array.from(
    new Set(
      readings
        .map((reading) => (typeof reading.deviceId === 'string' ? reading.deviceId.trim() : ''))
        .filter((id) => id.length > 0),
    ),
  );
  const devices = deviceIds.length
    ? await SensorDevice.find({ tenantId, deviceId: { $in: deviceIds } })
        .select('asset deviceId')
        .lean()
    : [];
  const deviceMap = new Map<string, { assetId?: string }>(
    devices.map((device) => [device.deviceId ?? '', { assetId: device.asset?.toString() }]),
  );

  return readings
    .map<SanitizedReading | null>((reading) => {
      const deviceId = typeof reading.deviceId === 'string' ? reading.deviceId.trim() : undefined;
      const assetId = reading.assetId ?? reading.asset ?? (deviceId ? deviceMap.get(deviceId)?.assetId : undefined);
      const metric = typeof reading.metric === 'string' ? reading.metric.trim() : '';
      const value = normalizeValue(reading.value);
      if (!assetId || !metric || value == null) {
        return null;
      }
      return {
        assetId,
        metric,
        value,
        ...(deviceId ? { deviceId } : {}),
        timestamp: normalizeTimestamp(reading.timestamp),
      };
    })
    .filter(
      (entry): entry is SanitizedReading => entry !== null,
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
      status: 'requested',
      assetId: meter.asset,
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
  const sanitized = await sanitizeReadings(tenantId, readings);
  if (!sanitized.length) {
    throw new Error('No valid readings provided');
  }

  const docs = await SensorReading.insertMany(
    sanitized.map((entry) => ({
      asset: entry.assetId,
      metric: entry.metric,
      value: entry.value,
      deviceId: entry.deviceId,
      timestamp: entry.timestamp,
      tenantId,
    })),
    { ordered: false },
  );

  const triggeredRules: RuleTriggerResult[] = [];
  const anomalies: AnomalyResult[] = [];
  const meterUpdates: MeterUpdateResult[] = [];
  const meterPmWorkOrders: MeterPmTriggerResult[] = [];
  const deviceUpdates: DeviceUpdateResult[] = [];
  const latestByDevice = new Map<string, { assetId: string; metric: string; value: number; timestamp: Date }>();
  const readingPayloads = new Map<string, SanitizedReading>();

  const ruleCache = new Map<string, ConditionRuleLean[]>();
  const triggerCache = new Map<string, IoTTriggerConfigLean[]>();
  const templateCache = new Map<string, TemplateLean | null>();

  docs.forEach((doc, index) => {
    const payload = sanitized[index];
    if (doc?._id && payload) {
      readingPayloads.set(doc._id.toString(), payload);
    }
  });

  for (const doc of docs) {
    const assetId = (doc.asset as Types.ObjectId | undefined)?.toString();
    const metric = doc.metric;
    const deviceId = typeof (doc as any).deviceId === 'string' ? (doc as any).deviceId : undefined;
    if (!assetId || !metric) continue;

    if (deviceId) {
      const current = latestByDevice.get(deviceId);
      if (!current || current.timestamp < doc.timestamp) {
        latestByDevice.set(deviceId, {
          assetId,
          metric,
          value: doc.value,
          timestamp: doc.timestamp ?? new Date(),
        });
      }
    }

    const cacheKey = `${tenantId}:${assetId}:${metric}`;
    if (!ruleCache.has(cacheKey)) {
      const query = {
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
      let template: TemplateLean | null = null;
      if (rule.pmTemplateId) {
        const templateKey = rule.pmTemplateId.toString();
        if (!templateCache.has(templateKey)) {
          const found = await PMTemplate.findOne({ _id: rule.pmTemplateId as any, tenantId: tenantId as any } as any)
            .select('name description tasks assignments')
            .lean();
          templateCache.set(templateKey, (found as TemplateLean | null) ?? null);
        }
        template = templateCache.get(templateKey) ?? null;
      }
      const result = await createWorkOrderFromRule(
        rule,
        tenantId,
        assetId,
        metric,
        doc.value,
        {
          source,
          readingId: doc._id as Types.ObjectId,
          timestamp: doc.timestamp ?? new Date(),
          payload: readingPayloads.get(doc._id?.toString?.() ?? ''),
          template,
        },
      );
      if (result) {
        triggeredRules.push(result);
      }
    }

    if (!triggerCache.has(cacheKey)) {
      const query = {
        tenantId,
        asset: doc.asset,
        metric,
        active: true,
      };
      triggerCache.set(
        cacheKey,
        (await IoTTriggerConfig.find(query).lean()) as IoTTriggerConfigLean[],
      );
    }
    const triggers = triggerCache.get(cacheKey) ?? [];
    for (const trigger of triggers) {
      if (
        trigger?.threshold == null ||
        !matchesRule(doc.value, trigger.operator ?? '>', trigger.threshold)
      ) {
        continue;
      }
      const lastTriggeredAt = trigger.lastTriggeredAt ? new Date(trigger.lastTriggeredAt) : null;
      const cooldownMinutes = trigger.cooldownMinutes ?? ANOMALY_COOLDOWN_MINUTES;
      if (lastTriggeredAt && doc.timestamp) {
        const diffMinutes = (doc.timestamp.getTime() - lastTriggeredAt.getTime()) / 60000;
        if (diffMinutes < cooldownMinutes) {
          continue;
        }
      }
      const result = await createWorkOrderFromTrigger(
        trigger,
        tenantId,
        assetId,
        metric,
        doc.value,
        {
          source,
          readingId: doc._id as Types.ObjectId,
          timestamp: doc.timestamp ?? new Date(),
          payload: readingPayloads.get(doc._id?.toString?.() ?? ''),
        },
      );
      if (result) {
        triggeredRules.push(result);
        await IoTTriggerConfig.updateOne(
          { _id: trigger._id },
          { lastTriggeredAt: doc.timestamp ?? new Date() },
        );
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

  if (latestByDevice.size) {
    for (const [deviceId, reading] of latestByDevice.entries()) {
      const updated = await SensorDevice.findOneAndUpdate(
        { tenantId, deviceId },
        {
          $set: {
            asset: reading.assetId,
            lastSeenAt: reading.timestamp,
            lastMetric: reading.metric,
            lastValue: reading.value,
            status: 'online',
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      deviceUpdates.push({
        deviceId,
        status: (updated.status as DeviceUpdateResult['status']) ?? 'online',
        lastSeenAt: reading.timestamp.toISOString(),
        assetId: reading.assetId,
        metric: reading.metric,
        value: reading.value,
      });
    }
  }

  return {
    savedCount: docs.length,
    triggeredRules,
    anomalies,
    ...(meterUpdates.length ? { meterUpdates } : {}),
    ...(meterPmWorkOrders.length ? { meterPmWorkOrders } : {}),
    ...(deviceUpdates.length ? { deviceUpdates } : {}),
  };
}
