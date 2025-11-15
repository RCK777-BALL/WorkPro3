/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const workOrderValidators = [
  body('departmentId')
    .notEmpty()
    .withMessage('departmentId is required')
    .bail()
    .isMongoId()
    .withMessage('departmentId must be a valid ID'),
  body('title').notEmpty().withMessage('title is required'),
  body('priority')
    .notEmpty()
    .withMessage('priority is required')
    .bail()
    .isIn(['low', 'medium', 'high', 'critical']),
  body('description').notEmpty().withMessage('description is required'),
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .bail()
    .isIn(['requested', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled']),
  body('type')
    .optional()
    .isIn(['corrective', 'preventive', 'inspection', 'calibration', 'safety']),
  body('assignees').optional().isArray(),
  body('assignees.*').isMongoId(),
  body('checklists').optional().isArray(),
  body('checklists.*.text').isString(),
  body('checklists.*.done').optional().isBoolean(),
  body('partsUsed').optional().isArray(),
  body('partsUsed.*.partId').isMongoId(),
  body('partsUsed.*.qty').isNumeric(),
  body('partsUsed.*.cost').isNumeric(),
  body('signatures').optional().isArray(),
  body('signatures.*.by').isMongoId(),
  body('signatures.*.ts').optional().isISO8601().toDate(),
  body('timeSpentMin').optional().isNumeric(),
  body('photos').optional().isArray(),
  body('photos.*')
    .isString()
    .custom((val) => /^https?:\/\//.test(val) || val.startsWith('/static/')),
  body('failureCode').optional().isString(),
  body('complianceProcedureId').optional().isString(),
  body('calibrationIntervalDays').optional().isInt({ min: 1 }).toInt(),
  body('scheduledDate').optional().isISO8601().toDate(),
  body('asset').optional().isMongoId(),
  body('dueDate').optional().isISO8601().toDate(),
  body('completedAt').optional().isISO8601().toDate(),
];
