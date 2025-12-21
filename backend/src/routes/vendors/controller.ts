import type { ParamsDictionary } from 'express-serve-static-core';
import { Types } from 'mongoose';
import { z } from 'zod';

import PurchaseOrder from '../../../models/PurchaseOrder';
import Vendor from '../../../models/Vendor';
import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { sendResponse } from '../../../utils/sendResponse';

type ListVendorsQuery = {
  search?: string;
  tags?: string | string[];
  includeInactive?: string;
  includeDeleted?: string;
  page?: string;
  pageSize?: string;
};

const vendorInputSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().optional().or(z.literal('').transform(() => undefined)),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const booleanFromQuery = (value?: string): boolean | undefined => {
  if (typeof value !== 'string') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
};

const serializeVendor = (vendor: any) => ({
  id: vendor._id.toString(),
  tenantId: vendor.tenantId.toString(),
  name: vendor.name,
  email: vendor.email ?? undefined,
  phone: vendor.phone ?? undefined,
  tags: vendor.tags ?? [],
  isActive: vendor.isActive,
  deletedAt: vendor.deletedAt ?? undefined,
  createdAt: vendor.createdAt,
  updatedAt: vendor.updatedAt,
});

const parseTags = (raw?: string | string[]): string[] | undefined => {
  if (!raw) return undefined;
  const values = Array.isArray(raw) ? raw : raw.split(',');
  const tags = values.map((tag) => tag.trim()).filter(Boolean);
  return tags.length ? Array.from(new Set(tags)) : undefined;
};

export const listVendorsHandler: AuthedRequestHandler<ParamsDictionary, unknown, unknown, ListVendorsQuery> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const includeInactive = booleanFromQuery(req.query.includeInactive) ?? false;
    const includeDeleted = booleanFromQuery(req.query.includeDeleted) ?? false;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const tags = parseTags(req.query.tags);

    const page = Math.max(parseInt(req.query.page ?? '1', 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId, 'tenant id'),
    };

    if (!includeDeleted) {
      query.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }];
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$and = [
        { $or: [{ name: regex }, { email: regex }, { phone: regex }] },
        ...((query.$and as Record<string, unknown>[] | undefined) ?? []),
      ];
    }

    if (tags?.length) {
      query.tags = { $all: tags };
    }

    const [items, total] = await Promise.all([
      Vendor.find(query).sort({ name: 1 }).skip(skip).limit(pageSize),
      Vendor.countDocuments(query),
    ]);

    sendResponse(res, {
      data: items.map((vendor) => serializeVendor(vendor)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorHandler: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const includeDeleted = booleanFromQuery((req.query as ListVendorsQuery).includeDeleted) ?? false;

    const vendor = await Vendor.findOne({
      _id: toObjectId(req.params.id, 'vendor id'),
      tenantId: toObjectId(tenantId, 'tenant id'),
      ...(includeDeleted ? {} : { deletedAt: { $in: [null, undefined] } }),
    });

    if (!vendor) {
      sendResponse(res, null, 'Vendor not found', 404);
      return;
    }

    sendResponse(res, serializeVendor(vendor));
  } catch (error) {
    next(error);
  }
};

export const createVendorHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const parsed = vendorInputSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const vendor = await Vendor.create({
      ...parsed.data,
      tenantId: toObjectId(tenantId, 'tenant id'),
      tags: parsed.data.tags ?? [],
      isActive: parsed.data.isActive ?? true,
      deletedAt: null,
    });

    sendResponse(res, serializeVendor(vendor), null, 201);
  } catch (error) {
    next(error);
  }
};

export const updateVendorHandler: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const parsed = vendorInputSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const vendor = await Vendor.findOneAndUpdate(
      { _id: toObjectId(req.params.id, 'vendor id'), tenantId: toObjectId(tenantId, 'tenant id'), deletedAt: { $in: [null, undefined] } },
      { $set: { ...parsed.data, tags: parsed.data.tags ?? [], deletedAt: null } },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      sendResponse(res, null, 'Vendor not found', 404);
      return;
    }

    sendResponse(res, serializeVendor(vendor));
  } catch (error) {
    next(error);
  }
};

export const deleteVendorHandler: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const result = await Vendor.findOneAndUpdate(
      { _id: toObjectId(req.params.id, 'vendor id'), tenantId: toObjectId(tenantId, 'tenant id'), deletedAt: { $in: [null, undefined] } },
      { deletedAt: new Date(), isActive: false },
    );

    if (!result) {
      sendResponse(res, null, 'Vendor not found', 404);
      return;
    }

    sendResponse(res, { message: 'Vendor deleted' });
  } catch (error) {
    next(error);
  }
};

export const vendorSpendHandler: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const tenantId = (req as AuthedRequest).tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const vendorId = toObjectId(req.params.id, 'vendor id');
    const tenantObjectId = toObjectId(tenantId, 'tenant id');

    const vendor = await Vendor.findOne({ _id: vendorId, tenantId: tenantObjectId, deletedAt: { $in: [null, undefined] } });
    if (!vendor) {
      sendResponse(res, null, 'Vendor not found', 404);
      return;
    }

    const spend = await PurchaseOrder.aggregate([
      { $match: { tenantId: tenantObjectId, $or: [{ vendorId }, { vendor: vendorId }] } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: '$_id' },
          totalLines: { $sum: 1 },
          totalSpend: { $sum: { $multiply: ['$lines.qtyOrdered', '$lines.price'] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: { $size: '$totalOrders' },
          totalLines: 1,
          totalSpend: 1,
        },
      },
    ]);

    const payload = spend[0] ?? { totalOrders: 0, totalLines: 0, totalSpend: 0 };

    sendResponse(res, { vendor: serializeVendor(vendor), ...payload });
  } catch (error) {
    next(error);
  }
};
