/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import VendorModel, { type VendorDocument, type VendorPricingTier } from './model';

export interface VendorContext {
  tenantId: string;
}

export interface VendorInput {
  name: string;
  leadTimeDays?: number;
  notes?: string;
  pricingTiers?: Array<{
    partId: string;
    minQty?: number;
    maxQty?: number;
    unitCost: number;
    currency?: string;
    leadTimeDays?: number;
  }>;
}

export interface VendorResponse {
  id: string;
  tenantId: string;
  name: string;
  leadTimeDays?: number;
  notes?: string;
  pricingTiers: Array<{
    partId: string;
    minQty?: number;
    maxQty?: number;
    unitCost: number;
    currency?: string;
    leadTimeDays?: number;
  }>;
  partsSupplied: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
};

const normalizePricingTiers = (tiers: VendorInput['pricingTiers']): VendorPricingTier[] =>
  (tiers ?? []).map((tier) => ({
    partId: toObjectId(tier.partId, 'part id'),
    minQty: tier.minQty ?? 0,
    maxQty: tier.maxQty,
    unitCost: tier.unitCost,
    currency: tier.currency,
    leadTimeDays: tier.leadTimeDays,
  }));

const buildPartsSupplied = (tiers: VendorPricingTier[]): Types.ObjectId[] => {
  const ids = tiers.map((tier) => tier.partId.toString());
  return Array.from(new Set(ids)).map((id) => new Types.ObjectId(id));
};

const serializeVendor = (vendor: VendorDocument): VendorResponse => ({
  id: (vendor._id as Types.ObjectId).toString(),
  tenantId: vendor.tenantId.toString(),
  name: vendor.name,
  leadTimeDays: vendor.leadTimeDays ?? undefined,
  notes: vendor.notes ?? undefined,
  pricingTiers: (vendor.pricingTiers ?? []).map((tier) => ({
    partId: tier.partId.toString(),
    minQty: tier.minQty ?? 0,
    maxQty: tier.maxQty,
    unitCost: tier.unitCost,
    currency: tier.currency,
    leadTimeDays: tier.leadTimeDays,
  })),
  partsSupplied: (vendor.partsSupplied ?? []).map((partId) => partId.toString()),
  createdAt: vendor.created_at,
  updatedAt: vendor.updated_at,
});

export const listVendors = async (context: VendorContext): Promise<VendorResponse[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendors = await VendorModel.find({ tenantId }).sort({ name: 1 });
  return vendors.map((vendor) => serializeVendor(vendor));
};

export const getVendor = async (context: VendorContext, id: string): Promise<VendorResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendor = await VendorModel.findOne({ _id: toObjectId(id, 'vendor id'), tenantId });
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  return serializeVendor(vendor);
};

export const createVendor = async (context: VendorContext, input: VendorInput): Promise<VendorResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const pricingTiers = normalizePricingTiers(input.pricingTiers);
  const partsSupplied = buildPartsSupplied(pricingTiers);
  const vendor = await VendorModel.create({
    tenantId,
    name: input.name,
    leadTimeDays: input.leadTimeDays ?? 0,
    notes: input.notes,
    pricingTiers,
    partsSupplied,
  });
  return serializeVendor(vendor);
};

export const updateVendor = async (
  context: VendorContext,
  id: string,
  input: VendorInput,
): Promise<VendorResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const pricingTiers = normalizePricingTiers(input.pricingTiers);
  const partsSupplied = buildPartsSupplied(pricingTiers);
  const vendor = await VendorModel.findOneAndUpdate(
    { _id: toObjectId(id, 'vendor id'), tenantId },
    {
      $set: {
        name: input.name,
        leadTimeDays: input.leadTimeDays ?? 0,
        notes: input.notes,
        pricingTiers,
        partsSupplied,
      },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  return serializeVendor(vendor);
};
