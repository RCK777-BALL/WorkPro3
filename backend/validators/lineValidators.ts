/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const lineValidators = [body('name').isString()];
export const lineUpdateValidators = [body('name').optional().isString()];
