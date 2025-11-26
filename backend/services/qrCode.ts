/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

type MaybeObjectId = Types.ObjectId | string | undefined | null;

export type QrEntityType = 'asset' | 'part';

export interface QrCodePayload {
  type: QrEntityType;
  id: string;
  tenantId?: string | undefined;
}

const toStringId = (value?: MaybeObjectId): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'string') return value;
  return undefined;
};

export const generateQrCodeValue = (payload: QrCodePayload): string =>
  JSON.stringify({ type: payload.type, id: payload.id, ...(payload.tenantId ? { tenantId: payload.tenantId } : {}) });

export const ensureQrCode = <T extends { _id?: MaybeObjectId; tenantId?: MaybeObjectId; qrCode?: string }>(
  entity: T,
  type: QrEntityType,
): T => {
  const id = toStringId(entity._id ?? (entity as any)?.id);
  if (!id) return entity;

  const qrCode = generateQrCodeValue({ type, id, tenantId: toStringId(entity.tenantId) });
  if (!entity.qrCode || entity.qrCode !== qrCode) {
    entity.qrCode = qrCode;
  }

  return entity;
};

export const parseQrCodeValue = (value: string): QrCodePayload | null => {
  try {
    const parsed = JSON.parse(value) as Partial<QrCodePayload>;
    if (!parsed.id || !parsed.type) return null;
    if (parsed.type !== 'asset' && parsed.type !== 'part') return null;
    return { type: parsed.type, id: parsed.id, tenantId: parsed.tenantId };
  } catch {
    return null;
  }
};

