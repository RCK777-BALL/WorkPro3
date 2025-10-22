/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const stationValidators = [body('name').isString()];
export const stationUpdateValidators = [body('name').optional().isString()];
