import { Request, Response, NextFunction } from 'express';

import predictiveService from '../utils/predictiveService';

export const getPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const results = await predictiveService.getPredictions(req.tenantId);
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
    const trend = await predictiveService.getPredictionTrend(
      req.params.assetId,
      req.params.metric,
      req.tenantId
    );
    res.json(trend);
  } catch (err) {
    next(err);
  }
};
