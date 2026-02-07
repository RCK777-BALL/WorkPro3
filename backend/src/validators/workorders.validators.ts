/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import {
  workOrderCreateSchema,
  workOrderQuerySchema,
  workOrderUpdateSchema,
} from '../../../shared/validators/workOrder';

export const validateWorkOrderCreate: RequestHandler = (req, _res, next) => {
  req.body = workOrderCreateSchema.parse(req.body);
  next();
};

export const validateWorkOrderUpdate: RequestHandler = (req, _res, next) => {
  req.body = workOrderUpdateSchema.parse(req.body);
  next();
};

export const validateWorkOrderQuery: RequestHandler = (req, _res, next) => {
  req.query = workOrderQuerySchema.parse(req.query) as any;
  next();
};
