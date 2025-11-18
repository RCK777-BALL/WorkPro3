/*
 * SPDX-License-Identifier: MIT
 */

import crypto from 'crypto';
import type { Types } from 'mongoose';

export const normalizeEtag = (value?: string | string[]): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return raw.replace(/^W\//, '').replace(/"/g, '').trim();
};

export const computeEtag = (id: Types.ObjectId | string, version: number, updatedAt?: Date): string => {
  const timestamp = updatedAt ? updatedAt.toISOString() : '';
  const base = `${id.toString()}:${version}:${timestamp}`;
  return crypto.createHash('sha256').update(base).digest('hex');
};

export const computeCollectionEtag = (
  items: Array<{ _id?: Types.ObjectId | string; version?: number; updatedAt?: Date; etag?: string }>,
): string => {
  const payload = items
    .map((item) => {
      const id = item._id ? item._id.toString() : 'unknown';
      const version = item.version ?? 0;
      const updatedAt = item.updatedAt ? item.updatedAt.toISOString() : '';
      return `${id}:${version}:${updatedAt}:${item.etag ?? ''}`;
    })
    .join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
};

export const bumpVersionMetadata = <T extends { _id: Types.ObjectId; version?: number; etag?: string; updatedAt?: Date }>(
  entity: T,
): T => {
  entity.version = (entity.version ?? 0) + 1;
  entity.etag = computeEtag(entity._id, entity.version, entity.updatedAt ?? new Date());
  return entity;
};
