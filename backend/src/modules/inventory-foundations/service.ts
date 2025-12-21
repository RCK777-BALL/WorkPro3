/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import type { PaginatedResult } from '../../../../shared/types/http';
import InventoryMovementModel from './models/InventoryMovement';
import PartModel, { type PartDocument } from './models/Part';
import PartStockModel, { type PartStockDocument } from './models/PartStock';
import StockLocationModel, { type StockLocationDocument } from './models/StockLocation';

export class InventoryFoundationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'InventoryFoundationError';
    this.status = status;
  }
}

export interface InventoryFoundationContext {
  tenantId: string;
  siteId?: string;
  userId?: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  tags?: string[];
  includeDeleted?: boolean;
}

export interface PartInput {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unitOfMeasure?: string;
  unitCost?: number;
  reorderPoint?: number;
  reorderQty?: number;
  preferredVendorId?: string;
  tags?: string[];
  attachments?: { name?: string; url?: string }[];
}

export interface StockLocationInput {
  name: string;
  code?: string;
  parentId?: string | null;
  tags?: string[];
}

export interface PartStockInput {
  partId: string;
  locationId: string;
  onHand?: number;
  reserved?: number;
  minQty?: number;
  maxQty?: number;
  tags?: string[];
}

export interface StockAdjustmentInput {
  delta?: number;
  newOnHand?: number;
  reason?: string;
  minQty?: number;
  maxQty?: number;
  recountNote?: string;
  recountedAt?: Date;
  recountedBy?: string;
}

export interface StockReceiptInput {
  quantity: number;
  reason?: string;
  minQty?: number;
  maxQty?: number;
  receivedAt?: Date;
  receivedBy?: string;
}

const toObjectId = (value: string | undefined | null, label: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) {
    throw new InventoryFoundationError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const normalizePagination = (options: PaginationOptions) => {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(options.pageSize) || 25));
  return { page, pageSize };
};

const buildTagFilter = (tags?: string[]) => {
  if (!tags || !tags.length) return undefined;
  return { tags: { $all: tags } };
};

const serializePart = (part: PartDocument, totals?: { onHand: number; reserved: number }) => ({
  id: part._id.toString(),
  name: part.name,
  description: part.description,
  sku: part.sku,
  barcode: part.barcode,
  unitOfMeasure: part.unitOfMeasure,
  unitCost: part.unitCost ?? 0,
  reorderPoint: part.reorderPoint ?? 0,
  reorderQty: part.reorderQty ?? 0,
  preferredVendorId: part.preferredVendorId?.toString(),
  tags: part.tags ?? [],
  attachments: part.attachments ?? [],
  deletedAt: part.deletedAt?.toISOString() ?? null,
  onHand: totals?.onHand ?? 0,
  reserved: totals?.reserved ?? 0,
  available: (totals?.onHand ?? 0) - (totals?.reserved ?? 0),
});

const serializeLocation = (location: StockLocationDocument) => ({
  id: location._id.toString(),
  name: location.name,
  code: location.code,
  parentId: location.parentId?.toString() ?? null,
  tags: location.tags ?? [],
  deletedAt: location.deletedAt?.toISOString() ?? null,
});

const serializePartStock = (stock: PartStockDocument) => ({
  id: stock._id.toString(),
  partId: stock.partId.toString(),
  locationId: stock.locationId.toString(),
  onHand: stock.onHand ?? 0,
  reserved: stock.reserved ?? 0,
  available: (stock.onHand ?? 0) - (stock.reserved ?? 0),
  minQty: stock.minQty,
  maxQty: stock.maxQty,
  tags: stock.tags ?? [],
  recountNote: stock.recountNote,
  recountedAt: stock.recountedAt?.toISOString(),
  recountedBy: stock.recountedBy?.toString(),
  deletedAt: stock.deletedAt?.toISOString() ?? null,
});

const applyAvailabilityGuard = (onHand: number, reserved: number) => {
  if (onHand - reserved < 0) {
    throw new InventoryFoundationError('Adjustment would over-issue available stock', 400);
  }
};

export const listParts = async (
  context: InventoryFoundationContext,
  options: PaginationOptions,
): Promise<PaginatedResult<ReturnType<typeof serializePart>>> => {
  const { page, pageSize } = normalizePagination(options);
  const filter: Record<string, unknown> = { tenantId: context.tenantId };
  if (!options.includeDeleted) {
    filter.deletedAt = null;
  }
  if (options.search) {
    filter.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { sku: { $regex: options.search, $options: 'i' } },
      { barcode: { $regex: options.search, $options: 'i' } },
    ];
  }
  const tagFilter = buildTagFilter(options.tags);
  if (tagFilter) Object.assign(filter, tagFilter);

  const [items, total, stockTotals] = await Promise.all([
    PartModel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    PartModel.countDocuments(filter),
    PartStockModel.aggregate<{
      _id: { partId: Types.ObjectId };
      onHand: number;
      reserved: number;
    }>([
      { $match: { tenantId: new Types.ObjectId(context.tenantId), deletedAt: null } },
      { $group: { _id: { partId: '$partId' }, onHand: { $sum: '$onHand' }, reserved: { $sum: '$reserved' } } },
    ]),
  ]);

  const totalsMap = stockTotals.reduce<Record<string, { onHand: number; reserved: number }>>((acc, entry) => {
    acc[entry._id.partId.toString()] = { onHand: entry.onHand ?? 0, reserved: entry.reserved ?? 0 };
    return acc;
  }, {});

  return {
    items: items.map((item) => serializePart(item, totalsMap[item._id.toString()])),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const getPart = async (
  context: InventoryFoundationContext,
  id: string,
  includeDeleted = false,
): Promise<ReturnType<typeof serializePart>> => {
  const part = await PartModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!part || (!includeDeleted && part.deletedAt)) {
    throw new InventoryFoundationError('Part not found', 404);
  }
  const totals = await PartStockModel.aggregate<{
    _id: { partId: Types.ObjectId };
    onHand: number;
    reserved: number;
  }>([
    { $match: { tenantId: new Types.ObjectId(context.tenantId), partId: new Types.ObjectId(id), deletedAt: null } },
    { $group: { _id: { partId: '$partId' }, onHand: { $sum: '$onHand' }, reserved: { $sum: '$reserved' } } },
  ]);
  const totalsEntry = totals[0] ? { onHand: totals[0].onHand ?? 0, reserved: totals[0].reserved ?? 0 } : undefined;
  return serializePart(part, totalsEntry);
};

export const savePart = async (
  context: InventoryFoundationContext,
  input: PartInput,
  id?: string,
): Promise<ReturnType<typeof serializePart>> => {
  const payload: Partial<PartDocument> = {
    tenantId: new Types.ObjectId(context.tenantId),
    siteId: toObjectId(context.siteId, 'site id'),
    name: input.name,
    description: input.description,
    sku: input.sku,
    barcode: input.barcode,
    unitOfMeasure: input.unitOfMeasure,
    unitCost: input.unitCost,
    reorderPoint: input.reorderPoint,
    reorderQty: input.reorderQty,
    preferredVendorId: toObjectId(input.preferredVendorId, 'vendor id'),
    tags: input.tags ?? [],
    attachments: input.attachments ?? [],
  };
  if (!id) {
    const created = await PartModel.create(payload);
    return serializePart(created);
  }
  const part = await PartModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!part) {
    throw new InventoryFoundationError('Part not found', 404);
  }
  Object.assign(part, payload);
  await part.save();
  return serializePart(part);
};

export const deletePart = async (context: InventoryFoundationContext, id: string): Promise<{ id: string }> => {
  const part = await PartModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!part) {
    throw new InventoryFoundationError('Part not found', 404);
  }
  part.deletedAt = new Date();
  await part.save();
  return { id };
};

export const listLocations = async (
  context: InventoryFoundationContext,
  options: PaginationOptions & { tree?: boolean },
): Promise<PaginatedResult<ReturnType<typeof serializeLocation>> | ReturnType<typeof serializeLocation>[]> => {
  const { page, pageSize } = normalizePagination(options);
  const filter: Record<string, unknown> = { tenantId: context.tenantId };
  if (!options.includeDeleted) filter.deletedAt = null;
  if (options.search) {
    filter.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { code: { $regex: options.search, $options: 'i' } },
    ];
  }
  const tagFilter = buildTagFilter(options.tags);
  if (tagFilter) Object.assign(filter, tagFilter);

  if (options.tree) {
    const locations = await StockLocationModel.find(filter).sort({ name: 1 });
    const mapped = locations.map(serializeLocation);
    const byParent = mapped.reduce<Record<string, ReturnType<typeof serializeLocation>[]>>((acc, loc) => {
      const parentKey = loc.parentId ?? 'root';
      acc[parentKey] = acc[parentKey] ?? [];
      acc[parentKey].push(loc);
      return acc;
    }, {});
    const buildTree = (parent: string | null): any[] => {
      const children = byParent[parent ?? 'root'] ?? [];
      return children.map((child) => ({ ...child, children: buildTree(child.id) }));
    };
    return buildTree(null);
  }

  const [items, total] = await Promise.all([
    StockLocationModel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    StockLocationModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeLocation),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const getLocation = async (
  context: InventoryFoundationContext,
  id: string,
  includeDeleted = false,
): Promise<ReturnType<typeof serializeLocation>> => {
  const location = await StockLocationModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!location || (!includeDeleted && location.deletedAt)) {
    throw new InventoryFoundationError('Location not found', 404);
  }
  return serializeLocation(location);
};

export const saveLocation = async (
  context: InventoryFoundationContext,
  input: StockLocationInput,
  id?: string,
): Promise<ReturnType<typeof serializeLocation>> => {
  const payload: Partial<StockLocationDocument> = {
    tenantId: new Types.ObjectId(context.tenantId),
    siteId: toObjectId(context.siteId, 'site id'),
    name: input.name,
    code: input.code,
    parentId: toObjectId(input.parentId ?? undefined, 'parent id'),
    tags: input.tags ?? [],
  };
  if (!id) {
    const created = await StockLocationModel.create(payload);
    return serializeLocation(created);
  }
  const location = await StockLocationModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!location) {
    throw new InventoryFoundationError('Location not found', 404);
  }
  Object.assign(location, payload);
  await location.save();
  return serializeLocation(location);
};

export const deleteLocation = async (
  context: InventoryFoundationContext,
  id: string,
): Promise<{ id: string }> => {
  const location = await StockLocationModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!location) {
    throw new InventoryFoundationError('Location not found', 404);
  }
  location.deletedAt = new Date();
  await location.save();
  return { id };
};

export const listPartStocks = async (
  context: InventoryFoundationContext,
  options: PaginationOptions,
): Promise<PaginatedResult<ReturnType<typeof serializePartStock>>> => {
  const { page, pageSize } = normalizePagination(options);
  const filter: Record<string, unknown> = { tenantId: context.tenantId };
  if (!options.includeDeleted) filter.deletedAt = null;
  if (options.search) {
    filter.$or = [
      { recountNote: { $regex: options.search, $options: 'i' } },
    ];
  }
  const tagFilter = buildTagFilter(options.tags);
  if (tagFilter) Object.assign(filter, tagFilter);

  const [items, total] = await Promise.all([
    PartStockModel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    PartStockModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializePartStock),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const getPartStock = async (
  context: InventoryFoundationContext,
  id: string,
  includeDeleted = false,
): Promise<ReturnType<typeof serializePartStock>> => {
  const stock = await PartStockModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!stock || (!includeDeleted && stock.deletedAt)) {
    throw new InventoryFoundationError('Stock not found', 404);
  }
  return serializePartStock(stock);
};

export const savePartStock = async (
  context: InventoryFoundationContext,
  input: PartStockInput,
  id?: string,
): Promise<ReturnType<typeof serializePartStock>> => {
  const partId = toObjectId(input.partId, 'part id');
  const locationId = toObjectId(input.locationId, 'location id');
  if (!partId || !locationId) {
    throw new InventoryFoundationError('Part and location are required', 400);
  }
  const part = await PartModel.findOne({ _id: partId, tenantId: context.tenantId });
  if (!part || part.deletedAt) {
    throw new InventoryFoundationError('Part not found', 404);
  }
  const location = await StockLocationModel.findOne({ _id: locationId, tenantId: context.tenantId });
  if (!location || location.deletedAt) {
    throw new InventoryFoundationError('Location not found', 404);
  }
  const payload: Partial<PartStockDocument> = {
    tenantId: new Types.ObjectId(context.tenantId),
    siteId: toObjectId(context.siteId, 'site id'),
    partId,
    locationId,
    onHand: input.onHand ?? 0,
    reserved: input.reserved ?? 0,
    minQty: input.minQty,
    maxQty: input.maxQty,
    tags: input.tags ?? [],
  };
  applyAvailabilityGuard(payload.onHand ?? 0, payload.reserved ?? 0);

  if (!id) {
    const created = await PartStockModel.create(payload);
    return serializePartStock(created);
  }
  const stock = await PartStockModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!stock) {
    throw new InventoryFoundationError('Stock not found', 404);
  }
  Object.assign(stock, payload);
  applyAvailabilityGuard(stock.onHand ?? 0, stock.reserved ?? 0);
  await stock.save();
  return serializePartStock(stock);
};

export const deletePartStock = async (
  context: InventoryFoundationContext,
  id: string,
): Promise<{ id: string }> => {
  const stock = await PartStockModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!stock) {
    throw new InventoryFoundationError('Stock not found', 404);
  }
  stock.deletedAt = new Date();
  await stock.save();
  return { id };
};

export const adjustStock = async (
  context: InventoryFoundationContext,
  id: string,
  input: StockAdjustmentInput,
): Promise<ReturnType<typeof serializePartStock>> => {
  const stock = await PartStockModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!stock || stock.deletedAt) {
    throw new InventoryFoundationError('Stock not found', 404);
  }

  const delta = input.newOnHand !== undefined ? input.newOnHand - stock.onHand : input.delta ?? 0;
  const nextOnHand = stock.onHand + delta;
  if (nextOnHand < 0) {
    throw new InventoryFoundationError('Quantity cannot be negative', 400);
  }
  applyAvailabilityGuard(nextOnHand, stock.reserved ?? 0);

  if (input.minQty !== undefined) stock.minQty = input.minQty;
  if (input.maxQty !== undefined) stock.maxQty = input.maxQty;
  if (input.recountNote !== undefined) stock.recountNote = input.recountNote;
  if (input.recountedBy) stock.recountedBy = toObjectId(input.recountedBy, 'recounted by');
  if (input.recountedAt || input.newOnHand !== undefined) {
    stock.recountedAt = input.recountedAt ?? new Date();
  }

  stock.onHand = nextOnHand;
  await stock.save();

  await InventoryMovementModel.create({
    tenantId: new Types.ObjectId(context.tenantId),
    partId: stock.partId,
    stockId: stock._id,
    type: 'adjust',
    quantity: delta,
    reason: input.reason,
    metadata: {
      minQty: input.minQty,
      maxQty: input.maxQty,
      recountNote: input.recountNote,
      recountedAt: stock.recountedAt,
      recountedBy: stock.recountedBy?.toString() ?? context.userId,
    },
  });

  return serializePartStock(stock);
};

export const receiveStock = async (
  context: InventoryFoundationContext,
  id: string,
  input: StockReceiptInput,
): Promise<ReturnType<typeof serializePartStock>> => {
  const stock = await PartStockModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!stock || stock.deletedAt) {
    throw new InventoryFoundationError('Stock not found', 404);
  }
  if (input.quantity <= 0 || Number.isNaN(input.quantity)) {
    throw new InventoryFoundationError('Quantity must be greater than zero', 400);
  }

  stock.onHand += input.quantity;
  if (input.minQty !== undefined) stock.minQty = input.minQty;
  if (input.maxQty !== undefined) stock.maxQty = input.maxQty;
  await stock.save();

  await InventoryMovementModel.create({
    tenantId: new Types.ObjectId(context.tenantId),
    partId: stock.partId,
    stockId: stock._id,
    type: 'receive',
    quantity: input.quantity,
    reason: input.reason,
    metadata: {
      minQty: input.minQty,
      maxQty: input.maxQty,
      receivedAt: input.receivedAt ?? new Date(),
      receivedBy: input.receivedBy ?? context.userId,
    },
  });

  return serializePartStock(stock);
};
