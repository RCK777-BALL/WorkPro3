/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/sendResponse';

import predictiveService from '../utils/predictiveService';

export const getPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      sendResponse(res, null, 'Missing tenantId', 400);
      return;
    }
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const results = await predictiveService.getPredictions(tenantId, typeFilter);
    sendResponse(res, results);
  } catch (err) {
    next(err);
  }
};

export const getTrend = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assetId, metric } = req.params;
    const { tenantId } = req;
    if (!assetId || !metric || !tenantId) {
      sendResponse(res, null, 'Missing required parameters', 400);
      return;
    }
    const trend = await predictiveService.getPredictionTrend(assetId, metric, tenantId);
    sendResponse(res, trend);
  } catch (err) {
    next(err);
  }
};
