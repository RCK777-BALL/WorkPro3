/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import { sendResponse } from './sendResponse';

export function validateItems<T>(
  res: Response,
  items: T[] | undefined,
  isValid: (item: T) => boolean,
  label: string,
): T[] | undefined {
  if (!items) return undefined;
  const invalid = items.find((item) => !isValid(item));
  if (invalid) {
    sendResponse(res, null, { message: `Invalid ${label}`, item: invalid }, 400);
    return undefined;
  }
  return items;
}

export default validateItems;
