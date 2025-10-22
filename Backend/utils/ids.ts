/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export function toObjectId(
  id?: string | Types.ObjectId,
): Types.ObjectId | undefined {
  if (!id) return undefined;
  if (id instanceof Types.ObjectId) return id;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}

export function toEntityId(id: string | Types.ObjectId): Types.ObjectId;
export function toEntityId(
  id?: string | Types.ObjectId,
): Types.ObjectId | undefined;
export function toEntityId(
  id?: string | Types.ObjectId,
): Types.ObjectId | undefined {
  if (!id) return undefined;
  if (id instanceof Types.ObjectId) return id;
  return new Types.ObjectId(id);
}

export default toEntityId;

