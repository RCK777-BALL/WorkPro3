/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

const allowedTypes = ['Electrical', 'Mechanical', 'Tooling', 'Interface'] as const;
const allowedStatuses = ['Active', 'Offline', 'In Repair'] as const;
const allowedCriticality = ['high', 'medium', 'low'] as const;

const sharedOptionalFields = [
  body('stationId').optional().isMongoId(),
  body('lineId').optional().isMongoId(),
  body('departmentId').optional().isMongoId(),
  body('station').optional().isString(),
  body('line').optional().isString(),
  body('department').optional().isString(),
  body('serialNumber').optional().isString(),
  body('description').optional().isString(),
  body('model')
    .optional()
    .isString()
    .bail()
    .custom((val, { req }) => {
      const request = req as Request;
      request.body.modelName = val;
      return true;
    }),
  body('modelName').optional().isString(),
  body('manufacturer').optional().isString(),
  body('purchaseDate').optional().isISO8601().toDate(),
  body('warrantyStart').optional().isISO8601().toDate(),
  body('warrantyEnd').optional().isISO8601().toDate(),
  body('replacementDate').optional().isISO8601().toDate(),
  body('purchaseCost').optional().isFloat({ min: 0 }).toFloat(),
  body('expectedLifeMonths').optional().isInt({ min: 1 }).toInt(),
  body('installationDate').optional().isISO8601().toDate(),
  body('criticality').optional().isIn([...allowedCriticality]),
  body('status')
    .optional()
    .isIn([...allowedStatuses])
    .withMessage('invalid status'),
];

export const assetValidators: ValidationChain[] = [
  body('name').notEmpty().withMessage('name is required'),
  body('type')
    .notEmpty()
    .isIn([...allowedTypes])
    .withMessage('type is required and must be valid'),
  body('location').notEmpty().withMessage('location is required'),
  ...sharedOptionalFields,
];

export const assetUpdateValidators: ValidationChain[] = [
  body()
    .custom((value, { req }) => {
      if (value && typeof value === 'object') {
        const request = req as Request;
        const payload = request.body as Record<string, unknown>;
        const updatableKeys = [
          'name',
          'type',
          'location',
          'departmentId',
          'department',
          'status',
          'serialNumber',
          'description',
          'model',
          'modelName',
          'manufacturer',
          'purchaseDate',
          'warrantyStart',
          'warrantyEnd',
          'purchaseCost',
          'expectedLifeMonths',
          'replacementDate',
          'installationDate',
          'line',
          'lineId',
          'station',
          'stationId',
          'siteId',
          'criticality',
          'documents',
        ];
        const hasUpdate = updatableKeys.some((key) => payload[key] !== undefined);
        if (hasUpdate) {
          return true;
        }
      }
      throw new Error('At least one field must be provided for update');
    })
    .withMessage('At least one field must be provided for update'),
  body('name').optional().notEmpty().withMessage('name is required'),
  body('type').optional().isIn([...allowedTypes]).withMessage('type must be valid'),
  body('location').optional().notEmpty().withMessage('location is required'),
  ...sharedOptionalFields,
];
