/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import type { FilterQuery } from 'mongoose';

import Prediction from '../models/Prediction';
import SensorReading from '../models/SensorReading';
import { sendResponse } from '../utils';

type RequestWithTenant = Request & { tenantId?: string | undefined };

async function getPredictions(
  req: RequestWithTenant,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = req;

    if (!tenantId) {
      sendResponse(res, null, 'Missing tenantId', 400);
      return;
    }

    const filters: FilterQuery<Record<string, unknown>> = { tenantId };

    if (typeof req.query.assetId === 'string') {
      filters.asset = req.query.assetId;
    }

    if (typeof req.query.metric === 'string') {
      filters.metric = req.query.metric;
    }

    const predictions = await Prediction.find(filters)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    sendResponse(res, predictions);
  } catch (err) {
    next(err);
  }
}

async function getTrend(req: RequestWithTenant, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req;
    const { assetId, metric } = req.params;

    if (!tenantId) {
      sendResponse(res, null, 'Missing tenantId', 400);
      return;
    }

    if (!assetId || !metric) {
      sendResponse(res, null, 'Missing required parameters', 400);
      return;
    }

    const readings = await SensorReading.find({
      tenantId,
      asset: assetId,
      metric,
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    sendResponse(res, readings);
  } catch (err) {
    next(err);
  }
}

async function computeTrendCorrelation(
  assetId: string,
  metric: string,
  tenantId: string
): Promise<number> {
  const readings = await SensorReading.find({ tenantId, asset: assetId, metric })
    .sort({ timestamp: 1 })
    .lean();

  const values = readings.map((reading) => reading.value ?? 0);

  if (values.length < 2) {
    return 0;
  }

  const first = values[0];
  const last = values[values.length - 1];
  return (last - first) / values.length;
}

export { getPredictions, getTrend, computeTrendCorrelation };

