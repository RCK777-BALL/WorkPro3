/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export interface RawPart {
  partId: Types.ObjectId | string;
  qty?: number;
  cost?: number;
}

export interface RawChecklist {
  description: string;
  done?: boolean;
}

export interface RawSignature {
  userId: Types.ObjectId | string;
  signedAt?: string | Date;
  name?: string;
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
): { text: string; done: boolean }[] =>
  items.map((item) => ({
    text: item.description,
    done: Boolean(item.done),
  }));

export const mapSignatures = (
  signatures: RawSignature[],
): { by: Types.ObjectId; ts: Date; name?: string }[] =>
  signatures.map((signature) => ({
    by:
      signature.userId instanceof Types.ObjectId
        ? signature.userId
        : new Types.ObjectId(signature.userId),
    ts: signature.signedAt ? new Date(signature.signedAt) : new Date(),
    ...(signature.name ? { name: signature.name } : {}),
  }));
