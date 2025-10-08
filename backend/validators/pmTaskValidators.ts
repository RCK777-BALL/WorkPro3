/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const pmTaskValidators = [
  body('title').notEmpty().withMessage('title is required'),
  body('rule.type')
    .notEmpty()
    .withMessage('rule.type is required')
    .isIn(['calendar', 'meter']),
  body('rule.cron')
    .if(body('rule.type').equals('calendar'))
    .notEmpty()
    .withMessage('cron is required for calendar tasks'),
  body('rule.meterName')
    .if(body('rule.type').equals('meter'))
    .notEmpty()
    .withMessage('meterName is required for meter tasks'),
  body('rule.threshold')
    .if(body('rule.type').equals('meter'))
    .isNumeric()
    .withMessage('threshold must be a number'),
  body('active').optional().isBoolean(),
  body('lastGeneratedAt').optional().isISO8601().toDate(),
  body('asset').optional().isMongoId(),
  body('notes').optional().isString(),
  body('department').optional().isString(),
];
