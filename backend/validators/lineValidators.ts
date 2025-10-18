/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const lineValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('departmentId').notEmpty().withMessage('departmentId is required'),
  body('notes').optional().isString(),
];

export const lineUpdateValidators = [
  body('name').optional().isString().bail().notEmpty().withMessage('name is required'),
  body('notes').optional().isString(),
];
