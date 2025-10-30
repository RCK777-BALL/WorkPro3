/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

const repeatConfigValidators = [
  body('repeatConfig.interval')
    .isInt({ min: 1 })
    .withMessage('repeatConfig.interval must be at least 1')
    .toInt(),
  body('repeatConfig.unit')
    .isIn(['day', 'week', 'month'])
    .withMessage('repeatConfig.unit must be day, week, or month'),
  body('repeatConfig.endDate')
    .optional()
    .notEmpty()
    .withMessage('repeatConfig.endDate cannot be empty')
    .isISO8601()
    .toDate(),
  body('repeatConfig.occurrences')
    .optional()
    .isInt({ min: 1 })
    .withMessage('repeatConfig.occurrences must be at least 1')
    .toInt(),
];

export const maintenanceScheduleValidators = [
  body('title').isString().notEmpty().withMessage('title is required'),
  body('description').optional().isString(),
  body('assetId').optional().isString(),
  body('frequency').isString().notEmpty(),
  body('nextDue').isISO8601().toDate(),
  body('estimatedDuration').isFloat({ min: 0 }).toFloat(),
  body('instructions').optional().isString(),
  body('type').isString().notEmpty(),
  ...repeatConfigValidators,
  body('parts').isArray(),
  body('parts.*').isString(),
  body('lastCompleted').optional().isISO8601().toDate(),
  body('lastCompletedBy').optional().isString(),
  body('assignedTo').optional().isString(),
];

export const maintenanceScheduleUpdateValidators = maintenanceScheduleValidators;
