/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { AssetInsightsError, getAssetInsights, type AssetInsightsContext } from './service';

type Maybe<T> = T | undefined;

const ensureTenant = (req: AuthedRequest, res: Response): Maybe<string> => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return undefined;
  }
  return req.tenantId;
};

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
  if (!ensureTenant(req, res)) return;
  try {
    const data = await getAssetInsights(buildContext(req), req.params.assetId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};
