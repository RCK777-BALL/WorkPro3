/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import { sendResponse } from './sendResponse';

export function validateItems<T>(
  res: Response,
  value: unknown,
  predicate: (item: T) => boolean,
  label: string,
): T[] | undefined {
  if (value == null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    sendResponse(res, null, `${label} must be an array`, 400);
    return undefined;
  }

  const normalized: T[] = [];
  for (const item of value as T[]) {
    if (!predicate(item)) {
      sendResponse(res, null, `Invalid ${label}`, 400);
      return undefined;
    }
    normalized.push(item);
  }

  return normalized;
}

export default validateItems;
