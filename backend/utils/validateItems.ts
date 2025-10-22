/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import { sendResponse } from './sendResponse';

export function validateItems<T>(
  res: Response,
  items: T[] | undefined,
  predicate: (item: T) => boolean,
  label: string,
): T[] | undefined | null {
  if (!items) {
    return undefined;
  }

  const invalid = items.filter((item) => !predicate(item));
  if (invalid.length > 0) {
    sendResponse(res, null, `${label} validation failed`, 400);
    return null;
  }

  return items;
}

export default {
  validateItems,
};
