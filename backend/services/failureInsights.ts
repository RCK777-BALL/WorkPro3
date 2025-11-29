/*
 * SPDX-License-Identifier: MIT
 */

import { Types, isValidObjectId, type FilterQuery } from 'mongoose';

import WorkOrder, { type WorkOrder as WorkOrderModel } from '../models/WorkOrder';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';

type WorkOrderLean = Omit<WorkOrderModel, '_id'> & { _id: Types.ObjectId };

export interface FailureSignal {
  label: string;
  detail: string;
  impact: number;
}

export interface RecommendedPart {
  name: string;
  quantity?: number;
  partId?: string;
  reason?: string;
}

export interface PmTemplateDraft {
  title: string;
  intervalDays: number;
  checklist: string[];
  parts: RecommendedPart[];
  tools: string[];
}

export interface FailurePredictionInsight {
  workOrderId?: string;
  assetId?: string;
  failureProbability: number;
  confidence: number;
  horizonDays: number;
  rootCauseSummary: string;
  signals: FailureSignal[];
  recommendedActions: string[];
  recommendedParts: RecommendedPart[];
  recommendedTools: string[];
  pmTemplateDraft?: PmTemplateDraft;
  generatedAt: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const computeTrend = (values: number[]) => {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  return (last - first) / values.length;
};

const normalizeObjectId = (value?: string) =>
  value && isValidObjectId(value) ? new Types.ObjectId(value) : undefined;

const selectInterval = (averageDowntime: number, correctiveRatio: number) => {
  if (averageDowntime > 360 || correctiveRatio > 0.6) return 14;
  if (averageDowntime > 240 || correctiveRatio > 0.4) return 21;
  if (averageDowntime > 120) return 28;
  return 45;
};

export async function buildFailurePrediction({
  tenantId,
  siteId,
  assetId,
  workOrderId,
}: {
  tenantId: string;
  siteId?: string;
  assetId?: string;
  workOrderId?: string;
}): Promise<FailurePredictionInsight> {
  const filter: FilterQuery<WorkOrderLean> = { tenantId };
  if (siteId) {
    filter.siteId = normalizeObjectId(siteId);
  }
  if (assetId) {
    filter.assetId = normalizeObjectId(assetId);
  }
  if (workOrderId) {
    filter._id = normalizeObjectId(workOrderId);
  }

  const workOrders = (await WorkOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(30)
    .select(
      'downtime downtimeMinutes wrenchTime status type completedAt failureCode title assetId timeSpentMin',
    )
    .lean()) as WorkOrderLean[];

  const downtimeSeries = workOrders.map((order) =>
    Number(order.downtimeMinutes ?? order.downtime ?? 0) || 0,
  );
  const wrenchSeries = workOrders.map((order) => Number(order.wrenchTime ?? order.timeSpentMin ?? 0) || 0);
  const correctiveRatio = workOrders.length
    ? workOrders.filter((order) => order.type === 'corrective').length / workOrders.length
    : 0;

  const averageDowntime = mean(downtimeSeries);
  const downtimeTrend = computeTrend(downtimeSeries.slice(-6));
  const wrenchTrend = computeTrend(wrenchSeries.slice(-6));

  const baseline = 0.18 + correctiveRatio * 0.35;
  const downtimeScore = clamp(averageDowntime / 420, 0, 0.35);
  const trendScore = clamp(downtimeTrend / 240, -0.05, 0.2);
  const wrenchScore = clamp(wrenchTrend / 240, -0.05, 0.12);

  const meterFilter: FilterQuery<Record<string, unknown>> = { tenantId };
  if (siteId) meterFilter.siteId = normalizeObjectId(siteId);
  if (assetId) meterFilter.asset = normalizeObjectId(assetId);

  const meters = await Meter.find(meterFilter).select('_id name unit pmInterval lastWOValue asset').lean();

  const meterSignals: FailureSignal[] = [];
  let meterImpact = 0;

  for (const meter of meters) {
    const readings = await MeterReading.find({ tenantId, meter: meter._id })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    if (readings.length < 2) continue;
    const delta = readings[0].value - readings[readings.length - 1].value;
    const direction = delta > 0 ? 'rising' : 'falling';
    const impact = clamp(Math.abs(delta) / Math.max(1, meter.pmInterval ?? 1), 0, 0.2);
    meterImpact += impact;
    meterSignals.push({
      label: `${meter.name} ${direction}`,
      detail: `Recent change of ${delta.toFixed(1)} ${meter.unit} across ${readings.length} readings`,
      impact,
    });
  }

  const failureProbability = clamp(baseline + downtimeScore + trendScore + wrenchScore + meterImpact, 0.05, 0.97);
  const confidence = clamp(0.5 + workOrders.length * 0.01 + meterSignals.length * 0.03, 0.55, 0.95);

  const signals: FailureSignal[] = [
    {
      label: 'Downtime pattern',
      detail: `Avg downtime ${averageDowntime.toFixed(1)} min with ${downtimeTrend >= 0 ? 'upward' : 'improving'} trend`,
      impact: clamp(downtimeScore + trendScore, 0, 0.6),
    },
    {
      label: 'Wrench time trend',
      detail: `Technician time ${wrenchTrend >= 0 ? 'increasing' : 'declining'} over last jobs`,
      impact: clamp(Math.abs(wrenchScore), 0, 0.25),
    },
    {
      label: 'Corrective ratio',
      detail: `${Math.round(correctiveRatio * 100)}% corrective workload last ${workOrders.length || 1} orders`,
      impact: clamp(correctiveRatio * 0.5, 0, 0.35),
    },
    ...meterSignals,
  ].filter(Boolean);

  const recommendedParts: RecommendedPart[] = [
    { name: 'Bearing kit', quantity: 1, reason: 'Covers most vibration-related downtime spikes' },
    { name: 'Seal set', quantity: 2, reason: 'Quick swap for leaks detected in corrective history' },
  ];

  const recommendedTools = ['Thermal camera', 'Vibration probe', 'Torque wrench'];

  const pmTemplateDraft: PmTemplateDraft = {
    title: workOrders[0]?.title ? `Stabilize ${workOrders[0].title}` : 'Stabilize critical asset',
    intervalDays: selectInterval(averageDowntime, correctiveRatio),
    checklist: [
      'Inspect lubrication points and record condition',
      'Capture meter readings for trending sensors',
      'Verify alignment and torque on rotating components',
      'Document anomalies with photos and notes',
    ],
    parts: recommendedParts,
    tools: recommendedTools,
  };

  const recommendedActions = [
    `Schedule PM in the next ${pmTemplateDraft.intervalDays} days based on downtime and corrective mix`,
    downtimeTrend > 0
      ? 'Downtime trending upward—prioritize quick inspection before next shift'
      : 'Downtime trending downward—maintain current PM cadence with spot checks',
    meterSignals.length > 0
      ? 'Cross-check meter drift with asset logs to validate suspected degradation'
      : 'Capture fresh meter readings to improve prediction confidence',
  ];

  const rootCauseSummary = [
    downtimeTrend > 0
      ? 'Rising downtime suggests degradation in wear components or lubrication gaps.'
      : 'Stable downtime but corrective mix hints at recurring minor defects.',
    meterSignals.length > 0
      ? 'Recent meter changes indicate process variation; correlate with operator notes.'
      : 'Limited meter history available; add readings to strengthen predictions.',
  ].join(' ');

  return {
    workOrderId: workOrderId ?? workOrders[0]?._id?.toString(),
    assetId: assetId ?? workOrders[0]?.assetId?.toString(),
    failureProbability,
    confidence,
    horizonDays: 30,
    rootCauseSummary,
    signals,
    recommendedActions,
    recommendedParts,
    recommendedTools,
    pmTemplateDraft,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildWorkOrderCopilot({
  tenantId,
  siteId,
  workOrderId,
}: {
  tenantId: string;
  siteId?: string;
  workOrderId: string;
}): Promise<FailurePredictionInsight & { nextBestActions: string[] }> {
  const base = await buildFailurePrediction({ tenantId, siteId, workOrderId });
  const nextBestActions = [
    'Attach latest meter readings to the work order',
    'Share PM draft with supervisor for approval',
    'Auto-assign inspection checklist to nearest technician',
  ];

  return { ...base, nextBestActions };
}

