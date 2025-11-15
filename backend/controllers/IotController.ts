/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { FilterQuery } from 'mongoose';

import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { ingestTelemetryBatch, type IoTReadingInput } from '../services/iotIngestionService';
import SensorReading from '../models/SensorReading';
import Asset from '../models/Asset';

interface IoTSignalQuery extends ParsedQs {
  assetId?: string;
  metric?: string;
  limit?: string;
}

type IngestBody =
  | IoTReadingInput
  | IoTReadingInput[]
  | { readings?: IoTReadingInput[] };

const toReadingArray = (payload: IngestBody): IoTReadingInput[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && Array.isArray(payload.readings)) {
    return payload.readings;
  }
  if (payload && typeof payload === 'object') {
    return [payload];
  }
  return [];
};

export const ingestTelemetry: AuthedRequestHandler<ParamsDictionary, unknown, IngestBody> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context is required', 400);
      return;
    }
    const readings = toReadingArray(req.body);
    if (!readings.length) {
      sendResponse(res, null, 'No readings provided', 400);
      return;
    }
    const result = await ingestTelemetryBatch({ tenantId, readings, source: 'http' });
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
};

export const getSignals: AuthedRequestHandler<ParamsDictionary, unknown, unknown, IoTSignalQuery> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context is required', 400);
      return;
    }
    const { assetId, metric, limit } = req.query;
    const parsedLimit = Math.min(Math.max(Number(limit) || 100, 10), 500);
    const filter: FilterQuery<Record<string, unknown>> = { tenantId };
    if (typeof assetId === 'string' && assetId.trim().length > 0) {
      filter.asset = assetId;
    }
    if (typeof metric === 'string' && metric.trim().length > 0) {
      filter.metric = metric;
    }
    const readings = await SensorReading.find(filter)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .lean();
    if (!readings.length) {
      sendResponse(res, []);
      return;
    }
    const grouped = new Map<
      string,
      {
        assetId: string;
        metric: string;
        points: { timestamp: string; value: number }[];
      }
    >();
    for (const reading of readings) {
      const assetKey = reading.asset?.toString();
      if (!assetKey) continue;
      const key = `${assetKey}:${reading.metric}`;
      if (!grouped.has(key)) {
        grouped.set(key, { assetId: assetKey, metric: reading.metric, points: [] });
      }
      grouped.get(key)?.points.push({
        timestamp: reading.timestamp?.toISOString?.() ?? new Date().toISOString(),
        value: reading.value,
      });
    }
    const assetIds = Array.from(new Set(Array.from(grouped.values()).map((entry) => entry.assetId)));
    const assets = await Asset.find({ _id: { $in: assetIds } })
      .select('name')
      .lean();
    const assetNameMap = new Map<string, string>(
      assets.map((asset) => [asset._id.toString(), asset.name ?? 'Unknown asset']),
    );
    const data = Array.from(grouped.values())
      .map((entry) => {
        const sortedPoints = entry.points.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        const latest = sortedPoints[sortedPoints.length - 1];
        const first = sortedPoints[0];
        return {
          assetId: entry.assetId,
          assetName: assetNameMap.get(entry.assetId),
          metric: entry.metric,
          latestValue: latest?.value ?? null,
          change: latest && first ? latest.value - first.value : 0,
          updatedAt: latest?.timestamp,
          points: sortedPoints,
        };
      })
      .sort((a, b) => (a.assetName ?? '').localeCompare(b.assetName ?? ''));
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};
