/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export const documentValidators = [
  body('name').optional().isString(),
  body('metadata').optional().isObject(),
  body('metadata.mimeType').optional().isIn(ALLOWED_MIME_TYPES),
  body('metadata.size').optional().isFloat({ min: 0 }),
  body('metadata.lastModified').optional().isISO8601(),
];
