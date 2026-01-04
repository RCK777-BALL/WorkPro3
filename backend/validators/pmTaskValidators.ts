/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import { body } from 'express-validator';

export const pmTaskValidators = [
  body('title').notEmpty().withMessage('title is required'),
  body('rule.type')
    .notEmpty()
    .withMessage('rule.type is required')
    .isIn(['calendar', 'meter']),
  body('rule.cron')
    .custom((value, { req }: { req: Request }) => {
      if (req.body?.rule?.type === 'calendar' && !value) {
        throw new Error('cron is required for calendar tasks');
      }

      return true;
    }),
  body('rule.meterName')
    .custom((value, { req }: { req: Request }) => {
      if (req.body?.rule?.type === 'meter' && !value) {
        throw new Error('meterName is required for meter tasks');
      }

      return true;
    }),
  body('rule.threshold')
    .custom((value, { req }: { req: Request }) => {
      if (req.body?.rule?.type !== 'meter') {
        return true;
      }

      if (value === undefined || value === null || value === '') {
        throw new Error('threshold must be a number');
      }

      if (Number.isNaN(Number(value))) {
        throw new Error('threshold must be a number');
      }

      return true;
    }),
  body('active').optional().isBoolean(),
  body('lastGeneratedAt').optional().isISO8601().toDate(),
  body('asset').optional().isMongoId(),
  body('workOrderTemplateId').optional().isMongoId(),
  body('templateVersion').optional().isInt({ min: 1 }),
  body('procedureTemplateId').optional().isMongoId(),
  body('notes').optional().isString(),
  body('department').optional().isString(),
];
