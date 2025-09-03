import { body } from 'express-validator';
export const pmTaskValidators = [
    body('title').notEmpty().withMessage('title is required'),
    body('frequency')
        .notEmpty()
        .withMessage('frequency is required')
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually']),
    body('active').optional().isBoolean(),
    body('lastRun').optional().isISO8601().toDate(),
    body('nextDue').optional().isISO8601().toDate(),
    body('asset').optional().isMongoId(),
    body('notes').optional().isString(),
    body('department').optional().isString(),
];
