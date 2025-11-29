/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type HydratedDocument } from 'mongoose';

import Vendor from '../models/Vendor';

export interface VendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface VendorResponse {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
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

const serializeVendor = (vendor: HydratedDocument<any>): VendorResponse => {
  const payload: VendorResponse = {
    id: vendor._id.toString(),
    tenantId: vendor.tenantId.toString(),
    name: vendor.name,
  };

  if (vendor.email) payload.email = vendor.email;
  if (vendor.phone) payload.phone = vendor.phone;

  return payload;
};

export const listVendors = async (tenantId: string): Promise<VendorResponse[]> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendors = await Vendor.find({ tenantId: scope }).sort({ name: 1 });
  return vendors.map((vendor) => serializeVendor(vendor));
};

export const getVendor = async (tenantId: string, vendorId: string): Promise<VendorResponse> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendor = await Vendor.findOne({ _id: toObjectId(vendorId, 'vendor id'), tenantId: scope });
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
  });
  return serializeVendor(vendor);
};

export const updateVendor = async (
  tenantId: string,
  vendorId: string,
  input: VendorInput,
): Promise<VendorResponse> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const vendor = await Vendor.findOneAndUpdate(
    { _id: toObjectId(vendorId, 'vendor id'), tenantId: scope },
    {
      name: input.name,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
    },
    { new: true, runValidators: true },
  );
  if (!vendor) {
    throw new VendorNotFoundError();
  }
  return serializeVendor(vendor);
};

export const deleteVendor = async (tenantId: string, vendorId: string): Promise<void> => {
  const scope = toObjectId(tenantId, 'tenant id');
  const deleted = await Vendor.findOneAndDelete({
    _id: toObjectId(vendorId, 'vendor id'),
    tenantId: scope,
  });
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
