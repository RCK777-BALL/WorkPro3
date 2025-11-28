/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type FilterQuery } from 'mongoose';
import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';

import Asset from '../../../models/Asset';
import PMTask from '../../../models/PMTask';
import type {
  InventoryAlert,
  InventoryLocation,
  Part as PartResponse,
  PurchaseOrder as PurchaseOrderResponse,
  StockAdjustment,
  StockHistoryEntry,
  StockItem as StockItemResponse,
  VendorSummary,
} from '../../../../shared/types/inventory';
import PartModel, { type PartDocument } from './models/Part';
import VendorModel, { type VendorDocument } from './models/Vendor';
import PurchaseOrderModel, { type PurchaseOrderDocument } from './models/PurchaseOrder';
import LocationModel, { type LocationDocument } from './models/Location';
import StockItemModel, { type StockItemDocument } from './models/StockItem';
import StockHistoryModel, { type StockHistoryDocument } from './models/StockHistory';
import type {
  LocationInput,
  PartInput,
  PurchaseOrderInput,
  PurchaseOrderStatusInput,
  StockAdjustmentInput,
  VendorInput,
} from './schemas';
import logger from '../../../utils/logger';

export interface InventoryContext {
  tenantId: string;
  siteId?: string;
  userId?: string;
}

export class InventoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'InventoryError';
    this.status = status;
  }
}

const AUTO_REORDER_COOLDOWN_MS = 1000 * 60 * 60 * 6;

type PartRecord = Pick<
  PartDocument,
  | 'name'
  | 'partNo'
  | 'description'
  | 'category'
  | 'sku'
  | 'partNumber'
  | 'location'
  | 'quantity'
  | 'unitCost'
  | 'unit'
  | 'cost'
  | 'minStock'
  | 'minQty'
  | 'maxQty'
  | 'reorderPoint'
  | 'reorderQty'
  | 'reorderThreshold'
  | 'leadTime'
  | 'autoReorder'
  | 'vendor'
  | 'assetIds'
  | 'pmTemplateIds'
  | 'lastRestockDate'
  | 'lastOrderDate'
  | 'notes'
  | 'lastAlertAt'
  | 'lastAutoReorderAt'
> & {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
};

type VendorRecord = Pick<
  VendorDocument,
  'tenantId' | 'name' | 'contact' | 'address' | 'leadTimeDays' | 'notes' | 'preferredSkus' | 'partsSupplied'
> & { _id: Types.ObjectId };

const toObjectId = (value: Types.ObjectId | string, label: string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new InventoryError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const maybeObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  return toObjectId(value, 'identifier');
};

const serializeVendor = (vendor: VendorDocument | VendorRecord): VendorSummary => {
  const vendorId = (vendor._id as Types.ObjectId).toString();
  const contactValue = vendor.contact?.name ?? vendor.contact?.email ?? vendor.contact?.phone;
  const summary: VendorSummary = {
    id: vendorId,
    name: vendor.name,
  };

  if (contactValue) {
    summary.contact = contactValue;
  }
  if (vendor.contact?.name) {
    summary.contactName = vendor.contact.name;
  }
  if (vendor.contact?.email) {
    summary.email = vendor.contact.email;
  }
  if (vendor.contact?.phone) {
    summary.phone = vendor.contact.phone;
  }
  if (vendor.address) {
    summary.address = vendor.address;
  }
  if (typeof vendor.leadTimeDays === 'number') {
    summary.leadTimeDays = vendor.leadTimeDays;
  }
  if (vendor.notes) {
    summary.notes = vendor.notes;
  }
  if (vendor.preferredSkus?.length) {
    summary.preferredSkus = vendor.preferredSkus;
  }
  if (vendor.partsSupplied?.length) {
    summary.partIds = vendor.partsSupplied.map((id: Types.ObjectId) => id.toString());
  }

  return summary;
};

const normalizeDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
};

const computeAlertState = (part: { quantity: number; reorderPoint: number }) => {
  if (part.quantity <= 0 && part.reorderPoint <= 0) {
    return { needsReorder: false, severity: 'ok' as const };
  }
  if (part.quantity <= part.reorderPoint / 2) {
    return { needsReorder: true, severity: 'critical' as const };
  }
  if (part.quantity <= part.reorderPoint) {
    return { needsReorder: true, severity: 'warning' as const };
  }
  return { needsReorder: false, severity: 'ok' as const };
};

const resolveReferenceMaps = async (parts: PartRecord[]) => {
  const vendorIds = new Set<string>();
  const assetIds = new Set<string>();
  const templateIds = new Set<string>();

  for (const part of parts) {
    if (part.vendor) {
      vendorIds.add(part.vendor.toString());
    }
    for (const assetId of part.assetIds ?? []) {
      if (assetId) {
        assetIds.add(assetId.toString());
      }
    }
    for (const templateId of part.pmTemplateIds ?? []) {
      if (templateId) {
        templateIds.add(templateId.toString());
      }
    }
  }

  const [vendors, assets, templates] = await Promise.all([
    vendorIds.size
      ? VendorModel.find({ _id: { $in: Array.from(vendorIds) } }).lean<VendorRecord>()
      : [],
    assetIds.size
      ? Asset.find({ _id: { $in: Array.from(assetIds) } })
          .select('name')
          .lean()
      : [],
    templateIds.size
      ? PMTask.find({ _id: { $in: Array.from(templateIds) } })
          .select('title')
          .lean()
      : [],
  ]);

  return {
    vendors: new Map(
      (vendors as VendorRecord[]).map((vendor) => [
        (vendor._id as Types.ObjectId).toString(),
        serializeVendor(vendor),
      ]),
    ),
    assets: new Map(
      (assets as Array<{ _id: Types.ObjectId; name: string }>).map((asset) => [
        asset._id.toString(),
        asset.name,
      ]),
    ),
    templates: new Map(
      (templates as Array<{ _id: Types.ObjectId; title: string }>).map((template) => [
        template._id.toString(),
        template.title,
      ]),
    ),
  };
};

const serializePart = (
  part: PartRecord,
  refs: Awaited<ReturnType<typeof resolveReferenceMaps>>,
): PartResponse => {
  const response: PartResponse = {
    id: part._id.toString(),
    tenantId: part.tenantId.toString(),
    name: part.name,
    quantity: part.quantity,
    reorderPoint: part.reorderPoint,
    autoReorder: part.autoReorder ?? false,
    assets: (part.assetIds ?? [])
      .map((assetId: Types.ObjectId) => ({
        id: assetId.toString(),
        name: refs.assets.get(assetId.toString()) ?? 'Unassigned asset',
      }))
      .filter((asset) => asset.id),
    pmTemplates: (part.pmTemplateIds ?? [])
      .map((templateId: Types.ObjectId) => ({
        id: templateId.toString(),
        title: refs.templates.get(templateId.toString()) ?? 'Template',
      }))
      .filter((template) => template.id),
    alertState: computeAlertState(part),
  };

  if (typeof part.unitCost === 'number') {
    response.unitCost = part.unitCost;
  }
  if (part.unit) {
    response.unit = part.unit;
  }
  if (typeof part.cost === 'number') {
    response.cost = part.cost;
  }

  if (part.siteId) {
    response.siteId = part.siteId.toString();
  }
  if (part.description) {
    response.description = part.description;
  }
  if (part.partNo) {
    response.partNo = part.partNo;
  }
  if (part.category) {
    response.category = part.category;
  }
  if (part.sku) {
    response.sku = part.sku;
  }
  if (part.partNumber) {
    response.partNumber = part.partNumber;
  }
  if (part.location) {
    response.location = part.location;
  }
  if (typeof part.minStock === 'number') {
    response.minStock = part.minStock;
  }
  if (typeof part.minQty === 'number') {
    response.minQty = part.minQty;
  }
  if (typeof part.maxQty === 'number') {
    response.maxQty = part.maxQty;
  }
  if (typeof part.reorderQty === 'number') {
    response.reorderQty = part.reorderQty;
  }
  if (typeof part.reorderThreshold === 'number') {
    response.reorderThreshold = part.reorderThreshold;
  }

  if (part.vendor) {
    response.vendorId = part.vendor.toString();
    const vendorSummary = refs.vendors.get(part.vendor.toString());
    if (vendorSummary) {
      response.vendor = vendorSummary;
    }
  }

  if (part.lastRestockDate) {
    response.lastRestockDate = part.lastRestockDate.toISOString();
  }
  if (part.lastOrderDate) {
    response.lastOrderDate = part.lastOrderDate.toISOString();
  }
  if (typeof part.leadTime === 'number') {
    response.leadTime = part.leadTime;
  }
  if (part.notes) {
    response.notes = part.notes;
  }
  if (part.lastAutoReorderAt) {
    response.lastAutoReorderAt = part.lastAutoReorderAt.toISOString();
  }

  return response;
};

const serializeLocation = (location: LocationDocument): InventoryLocation => {
  const response: InventoryLocation = {
    id: (location._id as Types.ObjectId).toString(),
    tenantId: location.tenantId.toString(),
    name: location.name,
    path: location.path,
  };
  if (location.siteId) response.siteId = location.siteId.toString();
  if (location.parent) response.parentId = location.parent.toString();
  if (location.store) response.store = location.store;
  if (location.room) response.room = location.room;
  if (location.bin) response.bin = location.bin;
  return response;
};

export const listParts = async (context: InventoryContext): Promise<PartResponse[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: Record<string, unknown> = { tenantId };
  if (context.siteId) {
    query.siteId = maybeObjectId(context.siteId);
  }
  const parts: PartRecord[] = await PartModel.find(query).lean<PartRecord[]>();
  const refs = await resolveReferenceMaps(parts);
  return parts.map((part) => serializePart(part, refs));
};

const buildLocationPath = async (
  tenantId: Types.ObjectId,
  parentId?: Types.ObjectId,
): Promise<string[]> => {
  if (!parentId) return [];
  const parent = await LocationModel.findOne({ _id: parentId, tenantId });
  return parent ? [...(parent.path ?? []), parent.name] : [];
};

export const listLocations = async (context: InventoryContext): Promise<InventoryLocation[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: Record<string, unknown> = { tenantId };
  if (context.siteId) query.siteId = maybeObjectId(context.siteId);
  const locations = await LocationModel.find(query).sort({ name: 1 });
  return locations.map((loc) => serializeLocation(loc));
};

export const saveLocation = async (
  context: InventoryContext,
  input: LocationInput,
  locationId?: string,
): Promise<InventoryLocation> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const parentId = input.parentId ? toObjectId(input.parentId, 'parent id') : undefined;
  const path = await buildLocationPath(tenantId, parentId);
  let location: LocationDocument | null;
  if (locationId) {
    location = await LocationModel.findOne({ _id: locationId, tenantId });
    if (!location) {
      throw new InventoryError('Location not found', 404);
    }
    location.set({
      name: input.name,
      store: input.store,
      room: input.room,
      bin: input.bin,
      parent: parentId,
      path,
      siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
    });
    await location.save();
  } else {
    location = await LocationModel.create({
      tenantId,
      siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
      name: input.name,
      store: input.store,
      room: input.room,
      bin: input.bin,
      parent: parentId,
      path,
    });
  }
  return serializeLocation(location);
};

const serializeStockItem = (
  stock: StockItemDocument,
  part?: PartDocument | null,
  location?: LocationDocument | null,
): StockItemResponse => {
  const response: StockItemResponse = {
    id: (stock._id as Types.ObjectId).toString(),
    tenantId: stock.tenantId.toString(),
    partId: stock.part.toString(),
    locationId: stock.location.toString(),
    quantity: stock.quantity,
  };
  if (stock.siteId) response.siteId = stock.siteId.toString();
  if (part) {
    response.part = {
      id: (part._id as Types.ObjectId).toString(),
      name: part.name,
    };
    if (part.partNumber) {
      response.part.partNumber = part.partNumber;
    }
    if (part.partNo) {
      response.part.partNo = part.partNo;
    }
  }
  if (typeof stock.unitCost === 'number') response.unitCost = stock.unitCost;
  if (stock.unit) response.unit = stock.unit;
  if (typeof stock.cost === 'number') response.cost = stock.cost;
  if (location) {
    response.location = serializeLocation(location);
  }
  return response;
};

const ensureStockItem = async (
  context: InventoryContext,
  stockItemId: string,
): Promise<StockItemDocument> => {
  const stockItem = await StockItemModel.findOne({ _id: stockItemId, tenantId: context.tenantId });
  if (!stockItem) {
    throw new InventoryError('Stock record not found', 404);
  }
  return stockItem;
};

export const listStockItems = async (context: InventoryContext): Promise<StockItemResponse[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: Record<string, unknown> = { tenantId };
  if (context.siteId) query.siteId = maybeObjectId(context.siteId);
  const stocks = await StockItemModel.find(query);
  const partIds = stocks.map((s) => s.part);
  const locationIds = stocks.map((s) => s.location);
  const [parts, locations] = await Promise.all([
    PartModel.find({ _id: { $in: partIds } }),
    LocationModel.find({ _id: { $in: locationIds } }),
  ]);
  const partMap = new Map(parts.map((p) => [(p._id as Types.ObjectId).toString(), p]));
  const locationMap = new Map(locations.map((l) => [(l._id as Types.ObjectId).toString(), l]));
  return stocks.map((stock) =>
    serializeStockItem(stock, partMap.get(stock.part.toString()) ?? undefined, locationMap.get(stock.location.toString()) ?? undefined),
  );
};

const recordStockHistory = async (
  context: InventoryContext,
  stockItem: StockItemDocument,
  delta: number,
  reason?: string,
): Promise<StockHistoryDocument> => {
  const location = await LocationModel.findById(stockItem.location);
  return StockHistoryModel.create({
    tenantId: toObjectId(context.tenantId, 'tenant id'),
    siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
    part: stockItem.part,
    stockItem: stockItem._id,
    locationSnapshot: {
      locationId: stockItem.location,
      store: location?.store,
      room: location?.room,
      bin: location?.bin,
    },
    delta,
    reason,
    createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
  });
};

export const adjustStock = async (
  context: InventoryContext,
  input: StockAdjustmentInput,
): Promise<StockAdjustment> => {
  const stockItem = await ensureStockItem(context, input.stockItemId);
  const part = await PartModel.findById(stockItem.part);
  stockItem.quantity += input.delta;
  if (stockItem.quantity < 0) stockItem.quantity = 0;
  await stockItem.save();
  if (part) {
    part.quantity = Math.max(0, (part.quantity ?? 0) + input.delta);
    await part.save();
  }
  await recordStockHistory(context, stockItem, input.delta, input.reason);
  const location = await LocationModel.findById(stockItem.location);
  const response: StockAdjustment = {
    stockItemId: (stockItem._id as Types.ObjectId).toString(),
    newQuantity: stockItem.quantity,
    partId: stockItem.part.toString(),
    locationId: stockItem.location.toString(),
  };

  if (input.reason) {
    response.reason = input.reason;
  }
  if (location) {
    response.location = serializeLocation(location);
  }

  return response;
};

export const listStockHistory = async (context: InventoryContext): Promise<StockHistoryEntry[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: Record<string, unknown> = { tenantId };
  if (context.siteId) query.siteId = maybeObjectId(context.siteId);
  const history = await StockHistoryModel.find(query).sort({ createdAt: -1 }).limit(100);
  return history.map((entry) => ({
    id: (entry._id as Types.ObjectId).toString(),
    partId: entry.part.toString(),
    stockItemId: entry.stockItem.toString(),
    delta: entry.delta,
    createdAt: entry.createdAt?.toISOString(),
    location: {
      locationId: entry.locationSnapshot.locationId.toString(),
      store: entry.locationSnapshot.store,
      room: entry.locationSnapshot.room,
      bin: entry.locationSnapshot.bin,
    },
    ...(entry.reason ? { reason: entry.reason } : {}),
  }));
};

const buildPartPayload = (input: PartInput): Partial<PartDocument> => {
  const payload: Partial<PartDocument> = {};

  if (input.description !== undefined) payload.description = input.description;
  if (input.partNo !== undefined) payload.partNo = input.partNo;
  if (input.category !== undefined) payload.category = input.category;
  if (input.sku !== undefined) payload.sku = input.sku;
  if (input.partNumber !== undefined) payload.partNumber = input.partNumber;
  if (input.location !== undefined) payload.location = input.location;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (typeof input.quantity === 'number') payload.quantity = input.quantity;
  if (typeof input.unitCost === 'number') payload.unitCost = input.unitCost;
  if (typeof input.cost === 'number') payload.cost = input.cost;
  if (input.unit !== undefined) payload.unit = input.unit;
  if (typeof input.minStock === 'number') payload.minStock = input.minStock;
  if (typeof input.minQty === 'number') payload.minQty = input.minQty;
  if (typeof input.maxQty === 'number') payload.maxQty = input.maxQty;
  if (typeof input.reorderPoint === 'number') payload.reorderPoint = input.reorderPoint;
  if (typeof input.reorderQty === 'number') payload.reorderQty = input.reorderQty;
  if (typeof input.reorderThreshold === 'number') payload.reorderThreshold = input.reorderThreshold;
  if (typeof input.leadTime === 'number') payload.leadTime = input.leadTime;
  if (typeof input.autoReorder === 'boolean') payload.autoReorder = input.autoReorder;
  if (input.assetIds !== undefined) {
    payload.assetIds = input.assetIds.map((id) => toObjectId(id, 'asset id'));
  }
  if (input.pmTemplateIds !== undefined) {
    payload.pmTemplateIds = input.pmTemplateIds.map((id) => toObjectId(id, 'template id'));
  }
  if (input.lastRestockDate) {
    const lastRestockDate = normalizeDate(input.lastRestockDate);
    if (lastRestockDate) {
      payload.lastRestockDate = lastRestockDate;
    }
  }
  if (input.lastOrderDate) {
    const lastOrderDate = normalizeDate(input.lastOrderDate);
    if (lastOrderDate) {
      payload.lastOrderDate = lastOrderDate;
    }
  }
  if (input.vendorId) {
    payload.vendor = toObjectId(input.vendorId, 'vendor id');
  } else if (input.vendorId === null) {
    delete payload.vendor;
  }
  return payload;
};

const ensurePart = async (context: InventoryContext, partId: string): Promise<PartDocument> => {
  const part = await PartModel.findOne({ _id: partId, tenantId: context.tenantId });
  if (!part) {
    throw new InventoryError('Part not found', 404);
  }
  return part;
};

const ensureVendor = async (context: InventoryContext, vendorId: string): Promise<VendorDocument> => {
  const vendor = await VendorModel.findOne({ _id: vendorId, tenantId: context.tenantId });
  if (!vendor) {
    throw new InventoryError('Vendor not found', 404);
  }
  return vendor;
};

const determineReorderQuantity = (part: PartDocument): number => {
  if (part.reorderQty && part.reorderQty > 0) {
    return part.reorderQty;
  }
  if (part.minStock && part.minStock > 0) {
    const delta = part.minStock - part.quantity;
    return delta > 0 ? delta : part.minStock;
  }
  const diff = part.reorderPoint - part.quantity;
  return diff > 0 ? diff : part.reorderPoint || 1;
};

const triggerAutoReorder = async (context: InventoryContext, part: PartDocument): Promise<void> => {
  if (!part.autoReorder || !part.vendor) {
    return;
  }
  if (part.quantity > part.reorderPoint) {
    return;
  }
  const now = new Date();
  if (part.lastAutoReorderAt && now.getTime() - part.lastAutoReorderAt.getTime() < AUTO_REORDER_COOLDOWN_MS) {
    return;
  }
  try {
    const vendor = await ensureVendor(context, part.vendor.toString());
    const quantity = Math.max(determineReorderQuantity(part), 1);
    const doc = await PurchaseOrderModel.create({
      tenantId: toObjectId(context.tenantId, 'tenant id'),
      siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
      vendor: vendor._id,
      status: 'draft',
      autoGenerated: true,
      notes: `Auto reorder for ${part.name}`,
      items: [
        {
          part: part._id,
          quantity,
          unitCost: part.unitCost,
        },
      ],
    });
    part.lastAutoReorderAt = now;
    part.lastAutoPurchaseOrderId = doc._id as Types.ObjectId;
    part.lastAlertAt = now;
    await part.save();
  } catch (err) {
    const partId = (part._id as Types.ObjectId).toString();
    logger.error('Failed to auto-reorder part %s: %s', partId, err);
  }
};

export const savePart = async (
  context: InventoryContext,
  input: PartInput,
  partId?: string,
): Promise<PartResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  let part: PartDocument;
  if (partId) {
    part = await ensurePart(context, partId);
    part.set({
      ...buildPartPayload(input),
      name: input.name ?? part.name,
    });
    await part.save();
  } else {
    part = await PartModel.create({
      tenantId,
      siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
      name: input.name,
      ...buildPartPayload(input),
    });
  }
  await triggerAutoReorder(context, part);
  const plainPart = part.toObject() as PartRecord;
  const refs = await resolveReferenceMaps([plainPart]);
  return serializePart(plainPart, refs);
};

export const listVendors = async (context: InventoryContext): Promise<VendorSummary[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendors = await VendorModel.find({ tenantId }).sort({ name: 1 });
  return vendors.map((vendor) => serializeVendor(vendor));
};

export const saveVendor = async (
  context: InventoryContext,
  input: VendorInput,
  vendorId?: string,
): Promise<VendorSummary> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  let vendor: VendorDocument;
  const payload: Partial<VendorDocument> = {
    name: input.name,
    preferredSkus: input.preferredSkus ?? [],
  };

  if (input.address !== undefined) payload.address = input.address;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.leadTimeDays !== undefined) payload.leadTimeDays = input.leadTimeDays;
  const contact: VendorDocument['contact'] = {};
  if (input.contactName !== undefined) contact.name = input.contactName;
  if (input.contactEmail !== undefined) contact.email = input.contactEmail;
  if (input.contactPhone !== undefined) contact.phone = input.contactPhone;
  if (contact.name || contact.email || contact.phone) {
    payload.contact = contact;
  }
  if (vendorId) {
    vendor = await ensureVendor(context, vendorId);
    vendor.set(payload);
    await vendor.save();
  } else {
    vendor = await VendorModel.create({
      tenantId,
      ...payload,
    });
  }
  return serializeVendor(vendor);
};

const serializePurchaseOrder = async (
  po: PurchaseOrderDocument,
): Promise<PurchaseOrderResponse> => {
  const [vendor, parts] = await Promise.all([
    VendorModel.findById(po.vendor),
    PartModel.find({ _id: { $in: po.items.map((item) => item.part) } })
      .select('name sku')
      .lean<Array<{ _id: Types.ObjectId; name: string }>>(),
  ]);
  const partMap = new Map(parts.map((part) => [part._id.toString(), part.name]));

  const mapStatus = (s: PurchaseOrderDocument['status']): PurchaseOrderResponse['status'] => {
    switch (s) {
      case 'draft':
        return 'Draft';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'ordered':
        return 'Ordered';
      case 'received':
        return 'Received';
      case 'closed':
        return 'Closed';
      default:
        return 'Draft';
    }
  };

  const response: PurchaseOrderResponse = {
    id: (po._id as Types.ObjectId).toString(),
    tenantId: po.tenantId?.toString(),
    status: mapStatus(po.status),
    autoGenerated: po.autoGenerated,
    createdAt: po.createdAt?.toISOString() ?? new Date().toISOString(),
    items: po.items.map((item) => {
      const purchaseItem: PurchaseOrderResponse['items'][number] = {
        partId: item.part.toString(),
        partName: partMap.get(item.part.toString()) ?? 'Part',
        quantity: item.quantity,
      };
      if (typeof item.qtyReceived === 'number') {
        purchaseItem.qtyReceived = item.qtyReceived;
      }
      if (typeof item.unitCost === 'number') {
        purchaseItem.unitCost = item.unitCost;
      }
      return purchaseItem;
    }),
  };

  if (po.siteId) {
    response.siteId = po.siteId.toString();
  }
  if (vendor) {
    response.vendor = serializeVendor(vendor);
  }
  if (po.poNumber) {
    response.poNumber = po.poNumber;
  }
  if (po.notes) {
    response.notes = po.notes;
  }
  if (po.expectedDate) {
    response.expectedDate = po.expectedDate.toISOString();
  }

  return response;
};

type PurchaseOrderQuery = FilterQuery<PurchaseOrderDocument>;

const buildPurchaseOrderQuery = (
  context: InventoryContext,
  purchaseOrderIds?: string[],
): PurchaseOrderQuery => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const filter: PurchaseOrderQuery = { tenantId };
  if (context.siteId) {
    filter.siteId = maybeObjectId(context.siteId);
  }
  if (purchaseOrderIds && purchaseOrderIds.length) {
    filter._id = {
      $in: purchaseOrderIds.map((id) => toObjectId(id, 'purchase order id')),
    };
  }
  return filter;
};

const formatDate = (value?: string) => (value ? new Date(value).toISOString().split('T')[0] : '—');

const buildCsvBuffer = (orders: PurchaseOrderResponse[]): Buffer => {
  const parser = new Json2csvParser<PurchaseOrderResponse>({
    fields: [
      { label: 'PO ID', value: 'id' },
      { label: 'Vendor', value: (row: PurchaseOrderResponse) => row.vendor?.name ?? '' },
      { label: 'Status', value: 'status' },
      {
        label: 'Auto generated',
        value: (row: PurchaseOrderResponse) => (row.autoGenerated ? 'Yes' : 'No'),
      },
      { label: 'Expected date', value: (row: PurchaseOrderResponse) => formatDate(row.expectedDate) },
      { label: 'Created at', value: (row: PurchaseOrderResponse) => formatDate(row.createdAt) },
      { label: 'Line items', value: (row: PurchaseOrderResponse) => row.items.length },
      {
        label: 'Total quantity',
        value: (row: PurchaseOrderResponse) =>
          row.items.reduce(
            (sum: number, item: PurchaseOrderResponse['items'][number]) => sum + item.quantity,
            0,
          ),
      },
    ],
  });
  const csv = parser.parse(orders);
  return Buffer.from(csv, 'utf8');
};

const renderPdfBuffer = async (orders: PurchaseOrderResponse[]): Promise<Buffer> => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text('Purchase orders export');
    doc.moveDown();

    orders.forEach((order, index) => {
      doc
        .fontSize(12)
        .fillColor('#111111')
        .text(`PO #${order.id}`, { continued: false });
      doc
        .fontSize(10)
        .fillColor('#444444')
        .text(`Vendor: ${order.vendor?.name ?? '—'}`);
      doc.text(`Status: ${order.status} • Auto generated: ${order.autoGenerated ? 'Yes' : 'No'}`);
      doc.text(`Expected: ${formatDate(order.expectedDate)} | Created: ${formatDate(order.createdAt)}`);
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#111111').text('Line items:');
      order.items.forEach((item: PurchaseOrderResponse['items'][number]) => {
        const costLabel = item.unitCost ? ` @ ${item.unitCost.toFixed(2)}` : '';
        doc.text(` • ${item.partName} — Qty ${item.quantity}${costLabel}`);
      });
      if (index < orders.length - 1) {
        doc.moveDown();
      }
    });

    doc.end();
  });
};

export type PurchaseOrderExportFormat = 'csv' | 'pdf';

export interface PurchaseOrderExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export const createPurchaseOrder = async (
  context: InventoryContext,
  input: PurchaseOrderInput,
): Promise<PurchaseOrderResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendor = await ensureVendor(context, input.vendorId);
  const items = input.items.map((item) => ({
    part: toObjectId(item.partId, 'part id'),
    quantity: item.quantity,
    unitCost: item.unitCost,
    qtyReceived: 0,
  }));
  const po = await PurchaseOrderModel.create({
    tenantId,
    siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
    vendor: vendor._id,
    notes: input.notes,
    poNumber: input.poNumber,
    expectedDate: normalizeDate(input.expectedDate),
    autoGenerated: input.autoGenerated ?? false,
    items,
  });
  return serializePurchaseOrder(po);
};

const ensurePurchaseOrder = async (
  context: InventoryContext,
  purchaseOrderId: string,
): Promise<PurchaseOrderDocument> => {
  const po = await PurchaseOrderModel.findOne({ _id: purchaseOrderId, tenantId: context.tenantId });
  if (!po) {
    throw new InventoryError('Purchase order not found', 404);
  }
  return po;
};

const ALLOWED_TRANSITIONS: Record<PurchaseOrderDocument['status'], PurchaseOrderDocument['status'][]> = {
  draft: ['pending'],
  pending: ['approved', 'closed'],
  approved: ['ordered', 'closed'],
  ordered: ['received', 'closed'],
  received: ['closed'],
  closed: [],
};

const applyReceipts = (
  po: PurchaseOrderDocument,
  receipts: PurchaseOrderStatusInput['receipts'],
): void => {
  if (!receipts) return;
  receipts.forEach((receipt) => {
    const line = po.items.find((item) => item.part.toString() === receipt.partId);
    if (!line) return;
    const nextValue = Math.min(line.quantity, (line.qtyReceived ?? 0) + receipt.quantity);
    line.qtyReceived = nextValue;
  });
};

export const transitionPurchaseOrder = async (
  context: InventoryContext,
  purchaseOrderId: string,
  input: PurchaseOrderStatusInput,
): Promise<PurchaseOrderResponse> => {
  const po = await ensurePurchaseOrder(context, purchaseOrderId);
  const allowed = ALLOWED_TRANSITIONS[po.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new InventoryError('Invalid purchase order transition', 400);
  }
  applyReceipts(po, input.receipts);
  po.status = input.status;
  await po.save();
  if (input.status === 'received' && input.receipts?.length) {
    await Promise.all(
      input.receipts.map(async (receipt) => {
        const partId = toObjectId(receipt.partId, 'part id');
        const part = await PartModel.findById(partId);
        if (part) {
          part.quantity = (part.quantity ?? 0) + receipt.quantity;
          await part.save();
        }
      }),
    );
  }
  return serializePurchaseOrder(po);
};

export const listPurchaseOrders = async (
  context: InventoryContext,
): Promise<PurchaseOrderResponse[]> => {
  const docs = await PurchaseOrderModel.find(buildPurchaseOrderQuery(context))
    .sort({ createdAt: -1 })
    .limit(50);
  return Promise.all(docs.map((doc) => serializePurchaseOrder(doc)));
};

export const exportPurchaseOrders = async (
  context: InventoryContext,
  format: PurchaseOrderExportFormat,
  purchaseOrderIds?: string[],
): Promise<PurchaseOrderExportResult> => {
  const docs = await PurchaseOrderModel.find(
    buildPurchaseOrderQuery(context, purchaseOrderIds),
  ).sort({ createdAt: -1 });
  if (!docs.length) {
    throw new InventoryError('No purchase orders available for export', 404);
  }
  const orders = await Promise.all(docs.map((doc) => serializePurchaseOrder(doc)));
  if (format === 'pdf') {
    const buffer = await renderPdfBuffer(orders);
    return {
      buffer,
      filename: `purchase-orders-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
    };
  }
  const buffer = buildCsvBuffer(orders);
  return {
    buffer,
    filename: `purchase-orders-${Date.now()}.csv`,
    mimeType: 'text/csv',
  };
};

export const listAlerts = async (context: InventoryContext): Promise<InventoryAlert[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const match: Record<string, unknown> = { tenantId, $expr: { $lte: ['$quantity', '$reorderPoint'] } };
  if (context.siteId) {
    match.siteId = maybeObjectId(context.siteId);
  }
  const parts: PartRecord[] = await PartModel.find(match).lean<PartRecord[]>();
  const refs = await resolveReferenceMaps(parts);
  return parts.map((part) => {
    const alert: InventoryAlert = {
      tenantId: part.tenantId.toString(),
      partId: part._id.toString(),
      partName: part.name,
      quantity: part.quantity,
      reorderPoint: part.reorderPoint,
      assetNames: (part.assetIds ?? [])
        .map((assetId: Types.ObjectId) => refs.assets.get(assetId.toString()))
        .filter((name: string | undefined): name is string => Boolean(name)),
      pmTemplateTitles: (part.pmTemplateIds ?? [])
        .map((templateId: Types.ObjectId) => refs.templates.get(templateId.toString()))
        .filter((title: string | undefined): title is string => Boolean(title)),
    };

    if (part.siteId) {
      alert.siteId = part.siteId.toString();
    }
    if (part.vendor) {
      const vendorName = refs.vendors.get(part.vendor.toString())?.name;
      if (vendorName) {
        alert.vendorName = vendorName;
      }
    }
    if (part.lastAlertAt) {
      alert.lastTriggeredAt = part.lastAlertAt.toISOString();
    }

    return alert;
  });
};
