import { Response, NextFunction } from 'express';
import predictiveService from '../utils/predictiveService';
import { AuthedRequest } from '../types/AuthedRequest';

export const getPredictions = async (
  req: AuthedRequest,
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
