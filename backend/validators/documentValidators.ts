/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const documentValidators = [body('name').optional().isString()];
