import { body } from 'express-validator';

export const inventoryValidators = [
  body('name').notEmpty().withMessage('name is required'),
 
  body('vendor').optional().isMongoId().withMessage('vendor must be a valid ID'),
 
];
