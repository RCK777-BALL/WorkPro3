/*
 * SPDX-License-Identifier: MIT
 */

import Asset from '../models/Asset';
import type { AssetCreateInput, AssetQueryInput, AssetUpdateInput } from '../../../shared/validators/asset';
import { Types } from 'mongoose';

export interface AssetListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

const buildSearchFilter = (search?: string) => {
  if (!search) return {};
  const regex = new RegExp(search, 'i');
  return { $or: [{ name: regex }, { description: regex }, { location: regex }, { serialNumber: regex }] };
};

export const listAssets = async (tenantId: string, query: AssetQueryInput): Promise<AssetListResult> => {
  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    ...buildSearchFilter(query.search),
  };

  if (query.status) {
    filter.status = query.status;
  }
  if (query.type) {
    filter.type = query.type;
  }

  const [items, total] = await Promise.all([
    Asset.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit };
};

export const getAssetById = async (tenantId: string, id: string) =>
  Asset.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) }).lean();

export const createAsset = async (tenantId: string, input: AssetCreateInput) => {
  const asset = await Asset.create({
    ...input,
    tenantId: new Types.ObjectId(tenantId),
  });
  return asset.toObject();
};

export const updateAsset = async (tenantId: string, id: string, input: AssetUpdateInput) => {
  const updated = await Asset.findOneAndUpdate(
    { _id: id, tenantId: new Types.ObjectId(tenantId) },
    { $set: input },
    { new: true },
  ).lean();
  return updated;
};

export const deleteAsset = async (tenantId: string, id: string) => {
  await Asset.deleteOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
};
