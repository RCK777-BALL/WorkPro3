/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import predictiveService from '../utils/predictiveService';

export const getPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      res.status(400).json({ message: 'Missing tenantId' });
      return;
    }
    const results = await predictiveService.getPredictions(tenantId);
    res.json(results);
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
      res.status(400).json({ message: 'Missing required parameters' });
      return;
    }
    const trend = await predictiveService.getPredictionTrend(assetId, metric, tenantId);
    res.json(trend);
  } catch (err) {
    next(err);
  }
};
