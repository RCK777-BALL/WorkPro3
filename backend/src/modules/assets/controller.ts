/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { AssetInsightsError, getAssetInsights, resolveAssetScanValue, type AssetInsightsContext } from './service';
import {
  createMeterConfig,
  ingestMeterReadings,
  listMetersForAsset,
  type MeterConfigPayload,
  type MeterReadingPayload,
} from './meterService';

const buildContext = (req: AuthedRequest): AssetInsightsContext => ({
  tenantId: req.tenantId!,
  siteId: req.siteId!,
  plantId: req.plantId!,
});

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof AssetInsightsError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

export const getAssetDetailsHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    const data = await getAssetInsights(buildContext(req), req.params.assetId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const listAssetMetersHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    const data = await listMetersForAsset(buildContext(req), req.params.assetId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createAssetMeterHandler: AuthedRequestHandler<
  { assetId: string },
  unknown,
  MeterConfigPayload
> = async (req, res, next) => {
  try {
    const meter = await createMeterConfig(buildContext(req), req.params.assetId, req.body);
    send(res, meter, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const ingestMeterReadingsHandler: AuthedRequestHandler<
  { assetId: string },
  unknown,
  MeterReadingPayload | MeterReadingPayload[]
> = async (req, res, next) => {
  try {
    const payloadArray = Array.isArray(req.body) ? req.body : [req.body];
    const result = await ingestMeterReadings(buildContext(req), req.params.assetId, payloadArray);
    send(res, result, 202);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const resolveAssetScanHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const rawValue = typeof req.query.value === 'string' ? req.query.value.trim() : '';
  if (!rawValue) {
    fail(res, 'Scan value is required', 400);
    return;
  }

  try {
    const data = await resolveAssetScanValue(buildContext(req), rawValue);
    if (!data) {
      fail(res, 'Asset not found', 404);
      return;
    }
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};
