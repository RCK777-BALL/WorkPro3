/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

import AuditLog from '../../../models/AuditLog';
import Meter, { type MeterDocument } from '../../../models/Meter';
import MeterReading from '../../../models/MeterReading';
import WorkOrder from '../../../models/WorkOrder';

export type MeterContext = {
  tenantId: string;
  siteId?: string;
};

export type MeterConfigPayload = {
  name: string;
  unit: string;
  pmInterval: number;
  thresholds?: { warning?: number; critical?: number };
};

export type MeterReadingPayload = {
  meterId?: string;
  name?: string;
  value: number;
  timestamp?: string | Date;
};

export type MeterTrendPoint = { timestamp: string; value: number };

export type MeterConfigResponse = {
  id: string;
  assetId: string;
  name: string;
  unit: string;
  currentValue: number;
  pmInterval: number;
  thresholds?: { warning?: number; critical?: number };
  updatedAt?: string;
  trend?: MeterTrendPoint[];
};

const normalizeTimestamp = (value?: string | Date): Date => {
  if (!value) return new Date();
  const asDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(asDate.getTime()) ? new Date() : asDate;
};

export const listMetersForAsset = async (
  context: MeterContext,
  assetId: string,
): Promise<MeterConfigResponse[]> => {
  const meters = await Meter.find({ tenantId: context.tenantId, asset: assetId })
    .sort({ updatedAt: -1 })
    .lean();

  const meterIds = meters.map((meter) => meter._id as Types.ObjectId);
  const readings = await MeterReading.aggregate<{
    _id: Types.ObjectId;
    points: { timestamp: Date; value: number }[];
  }>([
    { $match: { meter: { $in: meterIds } } },
    { $sort: { timestamp: -1 } },
    { $group: { _id: '$meter', points: { $push: { timestamp: '$timestamp', value: '$value' } } } },
  ]);
  const readingMap = new Map<string, { timestamp: Date; value: number }[]>(
    readings.map((entry) => [entry._id.toString(), entry.points.slice(0, 25).reverse()]),
  );

  return meters.map((meter) => ({
    id: meter._id?.toString() ?? '',
    assetId,
    name: meter.name,
    unit: meter.unit,
    currentValue: meter.currentValue ?? 0,
    pmInterval: meter.pmInterval,
    thresholds: meter.thresholds,
    updatedAt: meter.updatedAt?.toISOString(),
    trend: readingMap.get(meter._id?.toString() ?? '')?.map((point) => ({
      timestamp: point.timestamp.toISOString(),
      value: point.value,
    })),
  }));
};

export const createMeterConfig = async (
  context: MeterContext,
  assetId: string,
  payload: MeterConfigPayload,
): Promise<MeterConfigResponse> => {
  const meter = await Meter.create({
    tenantId: context.tenantId,
    siteId: context.siteId,
    asset: assetId,
    ...payload,
  });
  return {
    id: meter._id.toString(),
    assetId,
    name: meter.name,
    unit: meter.unit,
    currentValue: meter.currentValue ?? 0,
    pmInterval: meter.pmInterval,
    thresholds: meter.thresholds,
    updatedAt: meter.updatedAt?.toISOString(),
  };
};

const logAudit = async (
  tenantId: string,
  assetId: string,
  meter: MeterDocument,
  action: string,
  details?: Record<string, unknown>,
) => {
  await AuditLog.create({
    tenantId,
    action,
    entityType: 'meter',
    entityId: meter._id.toString(),
    entity: { type: 'meter', id: meter._id.toString(), label: meter.name },
    before: undefined,
    after: details,
    ts: new Date(),
    ...(meter.siteId ? { siteId: meter.siteId } : {}),
    ...(details?.asset ? { assetId } : {}),
  } as any);
};

const maybeCreateWorkOrder = async (
  tenantId: string,
  assetId: string,
  meter: MeterDocument,
  value: number,
  severity: 'warning' | 'critical',
) => {
  const existing = await WorkOrder.findOne({
    tenantId,
    assetId,
    title: { $regex: `^Meter ${meter.name}` },
    status: { $in: ['requested', 'assigned', 'in_progress'] },
  })
    .select('_id')
    .lean();

  if (existing?._id) return existing._id.toString();

  const wo = await WorkOrder.create({
    tenantId,
    assetId,
    title: `Meter ${meter.name} ${severity} threshold exceeded`,
    description: `Current reading ${value} ${meter.unit}`,
    priority: severity === 'critical' ? 'critical' : 'high',
    type: severity === 'critical' ? 'corrective' : 'preventive',
    status: 'requested',
  });

  await logAudit(tenantId, assetId, meter, 'meter.threshold_exceeded', {
    severity,
    value,
    workOrderId: wo._id.toString(),
  });

  return wo._id.toString();
};

const maybeCreatePmDeferral = async (
  tenantId: string,
  assetId: string,
  meter: MeterDocument,
  value: number,
) => {
  const deferral = await WorkOrder.create({
    tenantId,
    assetId,
    title: `PM deferral for ${meter.name}`,
    description: `Deferral recorded from meter reading ${value} ${meter.unit}`,
    priority: 'medium',
    type: 'preventive',
    status: 'pending_approval',
  });
  await logAudit(tenantId, assetId, meter, 'pm.deferral_created', {
    value,
    workOrderId: deferral._id.toString(),
  });
  return deferral._id.toString();
};

export const ingestMeterReadings = async (
  context: MeterContext,
  assetId: string,
  readings: MeterReadingPayload[],
) => {
  const sanitized = readings
    .map((reading) => ({
      meterId: reading.meterId,
      name: reading.name?.trim(),
      value: Number(reading.value),
      timestamp: normalizeTimestamp(reading.timestamp),
    }))
    .filter((reading) => Number.isFinite(reading.value) && (reading.meterId || reading.name));

  if (!sanitized.length) {
    throw new Error('No valid meter readings provided');
  }

  const results: { meterId: string; readingId: string; workOrderId?: string; pmDeferralId?: string }[] = [];

  for (const reading of sanitized) {
    const meter = await (reading.meterId
      ? Meter.findOne({ _id: reading.meterId, tenantId: context.tenantId })
      : Meter.findOne({ tenantId: context.tenantId, asset: assetId, name: reading.name }));

    if (!meter) {
      continue;
    }

    meter.currentValue = reading.value;
    meter.updatedAt = new Date();
    await meter.save();

    const createdReading = await MeterReading.create({
      meter: meter._id,
      value: reading.value,
      timestamp: reading.timestamp,
      tenantId: context.tenantId,
      siteId: context.siteId,
    });

    const response: { meterId: string; readingId: string; workOrderId?: string; pmDeferralId?: string } = {
      meterId: meter._id.toString(),
      readingId: createdReading._id.toString(),
    };

    const { thresholds } = meter;
    if (thresholds?.critical != null && reading.value >= thresholds.critical) {
      response.workOrderId = await maybeCreateWorkOrder(
        context.tenantId,
        assetId,
        meter,
        reading.value,
        'critical',
      );
    } else if (thresholds?.warning != null && reading.value >= thresholds.warning) {
      response.pmDeferralId = await maybeCreatePmDeferral(
        context.tenantId,
        assetId,
        meter,
        reading.value,
      );
    }

    results.push(response);
  }

  return { count: results.length, results };
};
