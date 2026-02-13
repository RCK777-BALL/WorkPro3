/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { assetCreateSchema, assetQuerySchema, assetUpdateSchema } from '../../../shared/validators/asset';

export const validateAssetCreate: RequestHandler = (req, _res, next) => {
  req.body = assetCreateSchema.parse(req.body);
  next();
};

export const validateAssetUpdate: RequestHandler = (req, _res, next) => {
  req.body = assetUpdateSchema.parse(req.body);
  next();
};

export const validateAssetQuery: RequestHandler = (req, _res, next) => {
  req.query = assetQuerySchema.parse(req.query) as any;
  next();
};
