/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const stationValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('lineId')
    .notEmpty()
    .withMessage('lineId is required')
    .bail()
    .isMongoId()
    .withMessage('lineId must be a valid id'),
  body('notes').optional().isString(),
];

export const stationUpdateValidators = [
  body()
    .custom((value, { req }) => {
      if (value && typeof value === 'object') {
        const { name, notes } = req.body as { name?: unknown; notes?: unknown };
        if (typeof name === 'string' && name.trim().length > 0) return true;
        if (typeof notes === 'string') return true;
      }
      throw new Error('No updates provided');
    })
    .withMessage('No updates provided'),
  body('name').optional().notEmpty().withMessage('name cannot be empty'),
  body('notes').optional().isString(),
];
