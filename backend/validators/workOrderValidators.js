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
        .isIn(['open', 'in-progress', 'on-hold', 'completed']),
    body('scheduledDate').optional().isISO8601().toDate(),
    body('asset').optional().isMongoId(),
    body('dueDate').optional().isISO8601().toDate(),
    body('completedAt').optional().isISO8601().toDate(),
];
