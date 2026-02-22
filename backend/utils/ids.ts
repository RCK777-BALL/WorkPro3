/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export type EntityIdLike = Types.ObjectId | string | string[] | null | undefined;

const normalizeInput = (value: EntityIdLike): string | Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0]; // take first
  return value;
};

export const toObjectId = (value: EntityIdLike): Types.ObjectId | undefined => {
  const v = normalizeInput(value);
  if (!v) return undefined;
  if (v instanceof Types.ObjectId) return v;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed && Types.ObjectId.isValid(trimmed) ? new Types.ObjectId(trimmed) : undefined;
};

export const toEntityId = (value: EntityIdLike): string | string[] | undefined => {
  const v = normalizeInput(value);
  if (!v) return undefined;
  if (v instanceof Types.ObjectId) return v.toString();
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
};