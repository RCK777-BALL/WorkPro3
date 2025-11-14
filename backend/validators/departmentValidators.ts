/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const departmentValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('description').optional({ nullable: true }).isString(),
  body('notes').optional({ nullable: true }).isString(),
];
