/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export interface RawPart {
  partId: Types.ObjectId | string;
  qty?: number | undefined;
  cost?: number | undefined;
}

export interface RawChecklist {
  description: string;
  done?: boolean | undefined;
  status?: 'not_started' | 'in_progress' | 'done' | 'blocked' | undefined;
  photos?: string[] | undefined;
}

export interface RawSignature {
  userId: Types.ObjectId | string;
  signedAt?: string | Date | undefined;
  name?: string | undefined;
}

export const mapAssignees = (values: (string | Types.ObjectId)[]): Types.ObjectId[] =>
  values
    .map((value) => (value instanceof Types.ObjectId ? value : new Types.ObjectId(value)))
    .filter((value, index, self) => self.findIndex((other) => other.equals(value)) === index);

export const mapPartsUsed = (
  parts: RawPart[],
): { partId: Types.ObjectId; qty: number; cost: number }[] =>
  parts.map((part) => ({
    partId: part.partId instanceof Types.ObjectId ? part.partId : new Types.ObjectId(part.partId),
    qty: part.qty ?? 1,
    cost: part.cost ?? 0,
  }));

export const mapChecklists = (
  items: RawChecklist[],
): {
  text: string;
  done: boolean;
  status?: RawChecklist['status'] | undefined;
  photos?: string[] | undefined;
}[] =>
  items.map((item) => ({
    text: item.description,
    done: Boolean(item.done),
    status: item.status ?? (item.done ? 'done' : 'not_started'),
    ...(item.photos?.length ? { photos: item.photos } : {}),
  }));

export const mapSignatures = (
  signatures: RawSignature[],
): { by: Types.ObjectId; ts: Date; name?: string | undefined }[] =>
  signatures.map((signature) => ({
    by:
      signature.userId instanceof Types.ObjectId
        ? signature.userId
        : new Types.ObjectId(signature.userId),
    ts: signature.signedAt ? new Date(signature.signedAt) : new Date(),
    ...(signature.name ? { name: signature.name } : {}),
  }));
