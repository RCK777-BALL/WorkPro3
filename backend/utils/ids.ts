/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

/**
 * Safely convert a string to a Mongoose ObjectId.
 *
 * Returns `null` when the input is not a valid ObjectId string.
 */
export const toObjectId = (id: unknown): Types.ObjectId | null => {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return null;
  try {
    return new Types.ObjectId(id);
  } catch {
    return null;
  }
};

export default toObjectId;
