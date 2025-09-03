import { body } from 'express-validator';
export const departmentValidators = [
    body('name').notEmpty().withMessage('name is required'),
    body('lines').optional().isArray(),
    body('lines.*.name').notEmpty().withMessage('line name is required'),
    body('lines.*.stations').optional(),
    body('lines.*.stations.*.name').notEmpty().withMessage('station name is required'),
];
