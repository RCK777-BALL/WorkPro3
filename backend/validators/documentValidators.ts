/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const documentValidators = [
  body('name').optional().isString(),
  body('metadata').optional().isObject(),
  body('metadata.size').optional().isFloat({ min: 0 }),
  body('metadata.mimeType').optional().isString(),
  body('metadata.lastModified').optional().isISO8601(),
  body('metadata.type').optional().isString(),
];
