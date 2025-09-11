/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const conditionRuleValidators = [
  body('asset').isMongoId().withMessage('asset is required'),
  body('metric').notEmpty().withMessage('metric is required'),
  body('operator')
    .optional()
    .isIn(['>', '<', '>=', '<=', '=='])
    .withMessage('invalid operator'),
  body('threshold').isNumeric().withMessage('threshold must be number'),
  body('workOrderTitle').notEmpty().withMessage('workOrderTitle is required'),
  body('workOrderDescription').optional().isString(),
  body('active').optional().isBoolean(),
];
