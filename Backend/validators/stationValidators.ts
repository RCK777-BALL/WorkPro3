/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const stationValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('lineId').notEmpty().withMessage('lineId is required'),
  body('notes').optional().isString(),
];

export const stationUpdateValidators = [
  body('name').optional().isString().bail().notEmpty().withMessage('name is required'),
  body('notes').optional().isString(),
];
