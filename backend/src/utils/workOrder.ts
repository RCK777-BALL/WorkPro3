/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export interface RawPart {
  partId: string | Types.ObjectId;
  qty?: number;
  cost?: number;
}

export interface RawChecklist {
  description: string;
  done?: boolean;
}

export interface RawSignature {
  userId: string | Types.ObjectId;
  signedAt?: string | Date;
}

const normalizeId = (value: string | Types.ObjectId): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

export const mapAssignees = (ids: (string | Types.ObjectId)[]): Types.ObjectId[] =>
  ids.map((id) => normalizeId(id));

export const mapPartsUsed = (
  parts: RawPart[],
): { partId: Types.ObjectId; qty: number; cost: number }[] =>
  parts.map((part) => ({
    partId: normalizeId(part.partId),
    qty: part.qty ?? 1,
    cost: part.cost ?? 0,
  }));

export const mapChecklists = (
  items: RawChecklist[],
): { text: string; done: boolean }[] =>
  items.map((item) => ({
    text: item.description,
    done: item.done ?? false,
  }));

const toDate = (value?: string | Date): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

export const mapSignatures = (
  items: RawSignature[],
): { by: Types.ObjectId; ts: Date }[] =>
  items.map((item) => ({
    by: normalizeId(item.userId),
    ts: toDate(item.signedAt),
  }));

export default {
  mapAssignees,
  mapPartsUsed,
  mapChecklists,
  mapSignatures,
};
