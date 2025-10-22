/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const departmentValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('notes').optional().isString(),
];
