/*
 * SPDX-License-Identifier: MIT
 */

import { body, type ValidationChain } from 'express-validator';

export const conditionRuleValidators: ValidationChain[] = [
  body('asset').isMongoId().withMessage('asset is required'),
  body('metric').notEmpty().withMessage('metric is required'),
  body('operator')
    .optional()
    .isIn(['>', '<', '>=', '<=', '=='])
    .withMessage('invalid operator'),
  body('threshold').isFloat().withMessage('threshold must be number'),
  body('workOrderTitle').notEmpty().withMessage('workOrderTitle is required'),
  body('workOrderDescription').optional().isString(),
  body('active').optional().isBoolean(),
];
