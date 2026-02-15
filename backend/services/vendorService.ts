/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Vendor, { type VendorDocument } from '../models/Vendor';

export interface VendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
  isActive?: boolean;
}

export interface VendorResponse {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  isActive: boolean;
  deletedAt?: string;
}

export class VendorNotFoundError extends Error {
  constructor() {
    super('Vendor not found');
    this.name = 'VendorNotFoundError';
  }
}

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
};

const serializeVendor = (vendor: VendorDocument): VendorResponse => {
  const payload: VendorResponse = {
    id: vendor._id.toString(),
    tenantId: vendor.tenantId.toString(),
    name: vendor.name,
    tags: vendor.tags ?? [],
    isActive: vendor.isActive,
  };

  if (vendor.email) payload.email = vendor.email;
  if (vendor.phone) payload.phone = vendor.phone;
  if (vendor.deletedAt) payload.deletedAt = vendor.deletedAt.toISOString();

  return payload;
};

const buildFilters = (tenantId: string, includeDeleted = false) => {
  const scope = toObjectId(tenantId, 'tenant id');
  const filter: Record<string, unknown> = { tenantId: scope };
  if (!includeDeleted) {
    filter.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }];
  }
  return filter;
};

export const listVendors = async (
  tenantId: string,
  includeDeleted = false,
): Promise<VendorResponse[]> => {
  const filter = buildFilters(tenantId, includeDeleted);
  const vendors = await Vendor.find(filter).sort({ name: 1 });
  return vendors.map((vendor) => serializeVendor(vendor));
};

export const getVendor = async (
  tenantId: string,
  vendorId: string,
  includeDeleted = false,
): Promise<VendorResponse> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendor = await Vendor.findOne({
    _id: toObjectId(vendorId, 'vendor id'),
    tenantId: scope,
    ...(includeDeleted ? {} : { deletedAt: { $in: [null] } }),
  });
  if (!vendor) {
    throw new VendorNotFoundError();
  }
  return serializeVendor(vendor);
};

export const createVendor = async (tenantId: string, input: VendorInput): Promise<VendorResponse> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendor = await Vendor.create({
    tenantId: scope,
    name: input.name,
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    tags: input.tags ?? [],
    isActive: input.isActive ?? true,
  });
  return serializeVendor(vendor);
};

export const updateVendor = async (
  tenantId: string,
  vendorId: string,
  input: VendorInput,
): Promise<VendorResponse> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendor = (await Vendor.findOneAndUpdate(
    { _id: toObjectId(vendorId, 'vendor id'), tenantId: scope, deletedAt: { $in: [null] } } as any,
    {
      name: input.name,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
      tags: input.tags ?? [],
      ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
    },
    { new: true, runValidators: true },
  )) as VendorDocument | null;
  if (!vendor) {
    throw new VendorNotFoundError();
  }
  return serializeVendor(vendor);
};

export const deleteVendor = async (tenantId: string, vendorId: string): Promise<void> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const deleted = await Vendor.findOneAndUpdate(
    {
      _id: toObjectId(vendorId, 'vendor id'),
      tenantId: scope,
      deletedAt: { $in: [null] },
    } as any,
    { deletedAt: new Date(), isActive: false },
  );
  if (!deleted) {
    throw new VendorNotFoundError();
  }
};

export const ensureVendor = async (
  tenantId: string,
  vendorId: string,
): Promise<{ id: string; name: string }> => {
  const vendor = await getVendor(tenantId, vendorId);
  return { id: vendor.id, name: vendor.name };
};

export default {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  ensureVendor,
};
