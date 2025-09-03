import { body } from 'express-validator';
export const assetValidators = [
    body('name').notEmpty().withMessage('name is required'),
    body('type')
        .notEmpty()
        .isIn(['Electrical', 'Mechanical', 'Tooling', 'Interface'])
        .withMessage('type is required and must be valid'),
    body('location').notEmpty().withMessage('location is required'),
    body('stationId').optional().isMongoId(),
    body('lineId').optional().isMongoId(),
    body('departmentId').optional().isMongoId(),
    body('serialNumber').optional().isString(),
    body('description').optional().isString(),
    body('model')
        .optional()
        .isString()
        .bail()
        .custom((val, { req }) => {
        req.body.modelName = val;
        return true;
    }),
    body('modelName').optional().isString(),
    body('manufacturer').optional().isString(),
    body('purchaseDate').optional().isISO8601().toDate(),
    body('installationDate').optional().isISO8601().toDate(),
    body('criticality').optional().isIn(['high', 'medium', 'low']),
    body('status')
        .optional()
        .isIn(['Active', 'Offline', 'In Repair'])
        .withMessage('invalid status'),
];
