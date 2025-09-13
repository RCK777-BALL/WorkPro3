/*
 * SPDX-License-Identifier: MIT
 */

import { body } from 'express-validator';

export const documentValidators = [
  body('name').optional().isString(),
  body('base64').optional().isString(),
  body('url').optional().isString(),
  body().custom((value) => {
    if (!value.base64 && !value.url) {
      throw new Error('Either base64 or url is required');
    }
    return true;
  }),
];
