/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const maintenanceScheduleValidators = [
  body('title').isString().withMessage('Title is required').notEmpty(),
  body('frequency').isString().withMessage('Frequency is required').notEmpty(),
  body('nextDue').optional().isISO8601().withMessage('nextDue must be a valid date'),
  body('estimatedDuration').optional().isNumeric(),
  body('parts').optional().isArray(),
  body('parts.*').optional().isString(),
  body('repeatConfig').optional().isObject(),
  body('repeatConfig.interval').optional().isInt({ min: 1 }),
  body('repeatConfig.unit')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('repeatConfig.unit must be day, week, or month'),
  body('repeatConfig.occurrences').optional().isInt({ min: 1 }),
  body('repeatConfig.endDate').optional({ checkFalsy: true }).isISO8601().withMessage('endDate must be a valid date'),
  body('assignedTo').optional().isString(),
  body('description').optional().isString(),
  body('instructions').optional().isString(),
  body('type').optional().isString(),
  body('assetId').optional().isString(),
  body('lastCompleted').optional({ checkFalsy: true }).isISO8601().withMessage('lastCompleted must be a valid date'),
  body('lastCompletedBy').optional().isString(),
];

export default maintenanceScheduleValidators;
