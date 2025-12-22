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
  id?: string;
  description: string;
  type?: 'checkbox' | 'numeric' | 'text' | 'pass_fail';
  required?: boolean | undefined;
  evidenceRequired?: boolean | undefined;
  completedValue?: string | number | boolean | undefined;
  done?: boolean | undefined;
  status?: 'not_started' | 'in_progress' | 'done' | 'blocked' | undefined;
  photos?: string[] | undefined;
  evidence?: string[] | undefined;
  completedAt?: string | Date | undefined;
  completedBy?: Types.ObjectId | string | undefined;
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
  id?: string;
  text: string;
  done: boolean;
  type?: RawChecklist['type'] | undefined;
  required?: boolean | undefined;
  evidenceRequired?: boolean | undefined;
  completedValue?: string | number | boolean | undefined;
  completedAt?: Date | undefined;
  completedBy?: Types.ObjectId | undefined;
  status?: RawChecklist['status'] | undefined;
  photos?: string[] | undefined;
  evidence?: string[] | undefined;
}[] =>
  items.map((item) => {
    const description = item.description ?? (item as unknown as { text?: string }).text ?? '';
    const hasCompletionValue = (() => {
      if (item.completedValue === undefined || item.completedValue === null) {
        return item.done !== undefined;
      }
      if (typeof item.completedValue === 'string') {
        return item.completedValue.trim().length > 0;
      }
      return true;
    })();
    const hasValue = hasCompletionValue || item.done !== undefined;
    const completed = Boolean(item.done ?? hasValue);
    const status = item.status ?? (hasValue ? 'done' : 'not_started');

    return {
      id: item.id,
      text: description,
      type: item.type ?? 'checkbox',
      required: item.required,
      evidenceRequired: item.evidenceRequired,
      completedValue: item.completedValue ?? item.done,
      completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      completedBy:
        item.completedBy instanceof Types.ObjectId
          ? item.completedBy
          : item.completedBy
            ? new Types.ObjectId(item.completedBy)
            : undefined,
      done: completed,
      status,
      ...(item.photos?.length ? { photos: item.photos } : {}),
      ...(item.evidence?.length ? { evidence: item.evidence } : {}),
    };
  });

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
