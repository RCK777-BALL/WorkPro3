import { body } from 'express-validator';

export const tenantValidators = [
  body('name').notEmpty().withMessage('name is required'),
  body('sso').optional().isObject().withMessage('sso must be an object'),
  body('sso.provider')
    .optional()
    .isIn(['okta', 'azure'])
    .withMessage('provider must be either okta or azure'),
  body('sso.issuer').optional().isString(),
  body('sso.clientId').optional().isString(),
];

export default tenantValidators;
