/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import {
  preventiveMaintenanceSchema,
  preventiveMaintenanceUpdateSchema,
} from '../../../shared/validators/preventiveMaintenance';

export const validatePmCreate: RequestHandler = (req, _res, next) => {
  req.body = preventiveMaintenanceSchema.parse(req.body);
  next();
};

export const validatePmUpdate: RequestHandler = (req, _res, next) => {
  req.body = preventiveMaintenanceUpdateSchema.parse(req.body);
  next();
};
