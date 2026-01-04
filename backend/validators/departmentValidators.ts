/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const departmentValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('description')
    .optional()
    .custom((value) => value === null || typeof value === 'string'),
  body('notes')
    .optional()
    .custom((value) => value === null || typeof value === 'string'),
];
