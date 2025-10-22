/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export type EntityIdLike = Types.ObjectId | string | null | undefined;

export const toObjectId = (value: EntityIdLike): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Types.ObjectId.isValid(trimmed) ? new Types.ObjectId(trimmed) : undefined;
};

export const toEntityId = (value: EntityIdLike): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};
