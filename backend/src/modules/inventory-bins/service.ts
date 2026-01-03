/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import InventoryBin, { type InventoryBinDocument } from '../inventory/models/InventoryBin';

export interface InventoryBinContext {
  tenantId: string;
  siteId?: string;
}

export interface InventoryBinInput {
  label: string;
  capacity?: number;
  locationId?: string;
  siteId?: string;
}

const toObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

export const listBins = async (context: InventoryBinContext): Promise<InventoryBinDocument[]> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return InventoryBin.find({ tenantId, ...(context.siteId ? { siteId: toObjectId(context.siteId) } : {}) })
    .sort({ label: 1 })
    .lean();
};

export const createBin = async (
  context: InventoryBinContext,
  input: InventoryBinInput,
): Promise<InventoryBinDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  const siteId = toObjectId(input.siteId ?? context.siteId);
  const locationId = toObjectId(input.locationId);
  return InventoryBin.create({
    tenantId,
    siteId,
    locationId,
    label: input.label,
    capacity: input.capacity,
  });
};
