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
  body('localization').optional().isObject(),
  body('localization.locale').optional().isString(),
  body('localization.timezone').optional().isString(),
  body('localization.unitSystem').optional().isIn(['metric', 'imperial']),
  body('customFields').optional().isObject(),
  body('customFields.workOrders')
    .optional()
    .custom((value) => Array.isArray(value))
    .withMessage('customFields.workOrders must be an array'),
  body('customFields.workOrders.*.key').optional().isString(),
  body('customFields.workOrders.*.label').optional().isString(),
  body('customFields.workOrders.*.type').optional().isString(),
  body('customFields.workOrders.*.required').optional().isBoolean(),
  body('customFields.assets')
    .optional()
    .custom((value) => Array.isArray(value))
    .withMessage('customFields.assets must be an array'),
  body('customFields.assets.*.key').optional().isString(),
  body('customFields.assets.*.label').optional().isString(),
  body('customFields.assets.*.type').optional().isString(),
  body('customFields.assets.*.required').optional().isBoolean(),
  body('sandbox').optional().isObject(),
  body('sandbox.enabled').optional().isBoolean(),
  body('sandbox.expiresAt').optional().isISO8601().toDate(),
  body('sandbox.provisionedBy').optional().isMongoId(),
];

export default tenantValidators;
