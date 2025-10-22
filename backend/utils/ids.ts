/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export const toObjectId = (value: string | Types.ObjectId): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

export const toEntityId = (value: string | Types.ObjectId): string =>
  value instanceof Types.ObjectId ? value.toHexString() : String(value);

export default {
  toObjectId,
  toEntityId,
};
