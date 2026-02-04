/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { purchaseOrderSchema, purchaseOrderUpdateSchema } from '../../../shared/validators/purchaseOrder';

export const validatePurchaseOrderCreate: RequestHandler = (req, _res, next) => {
  req.body = purchaseOrderSchema.parse(req.body);
  next();
};

export const validatePurchaseOrderUpdate: RequestHandler = (req, _res, next) => {
  req.body = purchaseOrderUpdateSchema.parse(req.body);
  next();
};
