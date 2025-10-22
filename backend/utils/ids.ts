/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export const toObjectId = (
  value: Types.ObjectId | string | null | undefined,
): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return undefined;
};

export const toEntityId = (
  value: Types.ObjectId | string | null | undefined,
): Types.ObjectId | undefined => toObjectId(value);
