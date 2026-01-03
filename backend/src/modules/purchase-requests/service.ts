/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PurchaseRequest, { type PurchaseRequestDocument, type PurchaseRequestItem } from '../../../models/PurchaseRequest';

export interface PurchaseRequestContext {
  tenantId: string;
  userId?: string;
  siteId?: string;
}

export interface PurchaseRequestInput {
  items: Array<{ partId: string; quantity: number; notes?: string }>;
  notes?: string;
}

const toObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

const mapItems = (items: PurchaseRequestInput['items']): PurchaseRequestItem[] =>
  items.map((item) => ({
    partId: new Types.ObjectId(item.partId),
    quantity: item.quantity,
    ...(item.notes ? { notes: item.notes } : {}),
  }));

export const listPurchaseRequests = async (
  context: PurchaseRequestContext,
): Promise<PurchaseRequestDocument[]> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return PurchaseRequest.find({ tenantId }).sort({ createdAt: -1 }).lean();
};

export const createPurchaseRequest = async (
  context: PurchaseRequestContext,
  input: PurchaseRequestInput,
): Promise<PurchaseRequestDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return PurchaseRequest.create({
    tenantId,
    requesterId: toObjectId(context.userId),
    siteId: toObjectId(context.siteId),
    status: 'submitted',
    items: mapItems(input.items),
    notes: input.notes,
  });
};
