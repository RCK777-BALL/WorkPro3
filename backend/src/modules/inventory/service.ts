/*
 * SPDX-License-Identifier: MIT
 */

import { MongoServerError } from 'mongodb';
import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';

import Asset from '../../../models/Asset';
import InventoryItem from '../../../models/InventoryItem';
import PMTask from '../../../models/PMTask';
import WorkOrder from '../../../models/WorkOrder';
import type {
  InventoryAlert,
  InventoryLocation,
  Part as PartResponse,
  PartUsageReport,
  PurchaseOrder as PurchaseOrderResponse,
  StockAdjustment,
  StockHistoryEntry,
  StockItem as StockItemResponse,
  InventoryTransfer,
  InventoryTransactionRecord,
  VendorSummary,
} from '../../../../shared/types/inventory';
import type { PaginatedResult, SortDirection } from '../../../../shared/types/http';
import PartModel, { type PartDocument } from './models/Part';
import VendorModel, { type VendorDocument } from './models/Vendor';
import PurchaseOrderModel, { type PurchaseOrderDocument } from './models/PurchaseOrder';
import LocationModel, { type LocationDocument } from './models/Location';
import StockItemModel, { type StockItemDocument } from './models/StockItem';
import StockHistoryModel, { type StockHistoryDocument } from './models/StockHistory';
import InventoryTransactionModel, {
  type InventoryTransactionDocument,
} from './models/InventoryTransaction';
import InventoryTransferModel, { type InventoryTransferDocument } from './models/Transfer';
import ReorderSuggestionModel, {
  type ReorderSuggestionDocument,
} from './models/ReorderSuggestion';
import ReorderAlertModel, {
  type ReorderAlertDocument,
  type ReorderAlertStatus,
} from './models/ReorderAlert';
import { logAuditEntry } from '../audit';
import type {
  LocationInput,
  PartInput,
  PurchaseOrderInput,
  PurchaseOrderStatusInput,
  StockAdjustmentInput,
  ReceiveInventoryInput,
  IssueInventoryInput,
  AdjustInventoryInput,
  TransferInventoryInput,
  StockCountInput,
  VendorInput,
  InventoryTransferInput,
} from './schemas';
import logger from '../../../utils/logger';

export interface InventoryContext {
  tenantId: string;
  siteId?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface PartUsageFilters {
  startDate?: Date;
  endDate?: Date;
  partIds?: string[];
  siteIds?: string[];
}

export interface ReorderAlertFilters {
  status?: ReorderAlertStatus;
  page?: number;
  pageSize?: number;
  partId?: string;
  siteId?: string;
}

export interface ListPartsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  vendorId?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface ReorderAlertList extends PaginatedResult<InventoryAlert> {
  openCount: number;
}

export interface ReorderSuggestionFilters {
  partId?: string;
  siteId?: string;
}

export interface ReorderSuggestionSummary {
  id: string;
  partId: string;
  partName: string;
  suggestedQty: number;
  siteId?: string;
  location?: {
    id: string;
    store?: string;
    room?: string;
    bin?: string;
  };
  onHand: number;
  onOrder: number;
  threshold: number;
  leadTimeDays?: number;
  source: {
    type: string;
    runId?: string;
    generatedAt?: string;
    criteria?: ReorderSuggestionDocument['source']['criteria'];
  };
  createdAt?: string;
}

export class InventoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'InventoryError';
    this.status = status;
  }
}

const ROLE_ORDER = [
  'warehouse-clerk',
  'operator',
  'supervisor',
  'manager',
  'admin',
  'planner',
  'team_leader',
  'area_leader',
  'assistant_department_leader',
  'department_leader',
  'operations_manager',
  'assistant_general_manager',
  'general_manager',
  'plant_admin',
  'global_admin',
];

const ROLE_RANK = new Map(ROLE_ORDER.map((role, index) => [role, index]));

const getRoleRank = (role: string): number => {
  const normalized = role.toLowerCase();
  return ROLE_RANK.get(normalized) ?? -1;
};

const hasRequiredRole = (context: InventoryContext, minimumRole: string): boolean => {
  const minRank = getRoleRank(minimumRole);
  if (minRank < 0) return true;
  const permissions = context.permissions ?? [];
  if (permissions.some((permission) => permission.includes('inventory'))) {
    return true;
  }
  const roles = context.roles ?? [];
  return roles.some((role) => getRoleRank(role) >= minRank);
};

const assertRoleLevel = (context: InventoryContext, minimumRole: string) => {
  if (!hasRequiredRole(context, minimumRole)) {
    throw new InventoryError('Forbidden', 403);
  }
};

const AUTO_REORDER_COOLDOWN_MS = 1000 * 60 * 60 * 6;

type PartRecord = Pick<
  PartDocument,
  | 'name'
  | 'barcode'
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
  | 'min'
  | 'max'
  | 'reorder'
  | 'minStock'
  | 'minQty'
  | 'maxQty'
  | 'minLevel'
  | 'maxLevel'
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

type ReorderSuggestionRecord = {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  targetLocation?: Types.ObjectId;
  suggestedQty: number;
  onHand: number;
  onOrder: number;
  threshold: number;
  leadTimeDays?: number;
  source: ReorderSuggestionDocument['source'];
  status: 'open' | 'dismissed';
  createdAt?: Date;
  updatedAt?: Date;
};

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

const computeAlertState = (part: { quantity: number; reorderPoint: number; minLevel?: number }) => {
  const threshold = typeof part.minLevel === 'number' && part.minLevel > 0 ? part.minLevel : part.reorderPoint;
  if (!threshold || threshold <= 0) {
    return { needsReorder: false, severity: 'ok' as const, minimumLevel: undefined };
  }
  if (part.quantity <= threshold / 2) {
    return { needsReorder: true, severity: 'critical' as const, minimumLevel: threshold };
  }
  if (part.quantity <= threshold) {
    return { needsReorder: true, severity: 'warning' as const, minimumLevel: threshold };
  }
  return { needsReorder: false, severity: 'ok' as const, minimumLevel: threshold };
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
  stock?: StockItemDocument[],
  locations?: Map<string, LocationDocument>,
): PartResponse => {
  const locationMap = locations ?? new Map<string, LocationDocument>();
  const response: PartResponse = {
    id: part._id.toString(),
    tenantId: part.tenantId.toString(),
    name: part.name,
    ...(part.barcode ? { barcode: part.barcode } : {}),
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

  if (stock?.length) {
    response.stockByLocation = stock.map((item) => {
      const serialized = serializeStockItem(
        item,
        undefined,
        locationMap.get(item.location.toString()) ?? undefined,
      );

      return {
        stockItemId: serialized.id,
        locationId: serialized.locationId,
        quantity: serialized.quantity,
        unitCost: serialized.unitCost,
        unit: serialized.unit,
        cost: serialized.cost,
        ...(serialized.location ? { location: serialized.location } : {}),
      };
    });

    response.quantity = stock.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    response.alertState = computeAlertState({
      quantity: response.quantity,
      reorderPoint: part.reorderPoint,
    });
  }

  if (typeof part.unitCost === 'number') {
    response.unitCost = part.unitCost;
  }
  if (part.unit) {
    response.unit = part.unit;
  }
  if (typeof part.cost === 'number') {
    response.cost = part.cost;
  }
  if (typeof part.min === 'number') {
    response.min = part.min;
  }
  if (typeof part.max === 'number') {
    response.max = part.max;
  }
  if (typeof part.reorder === 'number') {
    response.reorder = part.reorder;
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
  if (typeof part.minLevel === 'number') {
    response.minLevel = part.minLevel;
  }
  if (typeof part.maxLevel === 'number') {
    response.maxLevel = part.maxLevel;
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
    store: location.store,
  };
  if (location.siteId) response.siteId = location.siteId.toString();
  if (location.room) response.room = location.room;
  if (location.bin) response.bin = location.bin;
  if (location.barcode) response.barcode = location.barcode;
  return response;
};

const formatLocationLabel = (location: LocationDocument): string =>
  [location.store, location.room, location.bin].filter(Boolean).join(' / ') || location._id.toString();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveSortField = (raw: string | undefined): keyof PartRecord => {
  const normalized = (raw ?? '').toLowerCase();
  const mapping: Record<string, keyof PartRecord> = {
    name: 'name',
    sku: 'sku',
    quantity: 'quantity',
    reorderpoint: 'reorderPoint',
    autoreorder: 'autoReorder',
    category: 'category',
    vendor: 'vendor',
    lastorderdate: 'lastOrderDate',
  };
  return mapping[normalized] ?? 'name';
};

export const listParts = async (
  context: InventoryContext,
  options: ListPartsOptions = {},
): Promise<PaginatedResult<PartResponse>> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(Math.max(1, options.pageSize ?? 25), 200);
  const search = typeof options.search === 'string' ? options.search.trim() : '';
  const vendorFilter = options.vendorId ? maybeObjectId(options.vendorId) : undefined;
  const sortDirection = options.sortDirection === 'desc' ? -1 : 1;
  const sortField = resolveSortField(options.sortBy);

  const query: FilterQuery<PartDocument> = { tenantId };
  if (context.siteId) {
    query.siteId = maybeObjectId(context.siteId);
  }
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { partNumber: searchRegex },
      { category: searchRegex },
      { description: searchRegex },
    ];
  }
  if (vendorFilter) {
    query.vendor = vendorFilter;
  }

  const total = await PartModel.countDocuments(query);
  const parts: PartRecord[] = await PartModel.find(query)
    .sort({ [sortField]: sortDirection })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean<PartRecord[]>();
  const partIds = parts.map((part) => part._id);
  const [refs, stockItems] = await Promise.all([
    resolveReferenceMaps(parts),
    StockItemModel.find({
      tenantId,
      ...(context.siteId ? { siteId: maybeObjectId(context.siteId) } : {}),
      part: { $in: partIds },
    }),
  ]);

  const locationIds = stockItems.map((item) => item.location);
  const locations = locationIds.length
    ? await LocationModel.find({ _id: { $in: locationIds } })
    : [];
  const locationMap = new Map(
    locations.map((loc) => [(loc._id as Types.ObjectId).toString(), loc]),
  );
  const stockByPart = stockItems.reduce((acc, item) => {
    const key = item.part.toString();
    const current = acc.get(key) ?? [];
    current.push(item);
    acc.set(key, current);
    return acc;
  }, new Map<string, StockItemDocument[]>());

  const items = parts.map((part) =>
    serializePart(part, refs, stockByPart.get(part._id.toString()), locationMap),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sortBy: options.sortBy ?? 'name',
    sortDirection: options.sortDirection ?? 'asc',
  };
};

export const listLocations = async (context: InventoryContext): Promise<InventoryLocation[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: Record<string, unknown> = { tenantId };
  if (context.siteId) query.siteId = maybeObjectId(context.siteId);
  const locations = await LocationModel.find(query).sort({ store: 1, room: 1, bin: 1 });
  return locations.map((loc) => serializeLocation(loc));
};

export const saveLocation = async (
  context: InventoryContext,
  input: LocationInput,
  locationId?: string,
): Promise<InventoryLocation> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  let location: LocationDocument | null;
  try {
    if (locationId) {
      location = await LocationModel.findOne({ _id: locationId, tenantId });
      if (!location) {
        throw new InventoryError('Location not found', 404);
      }
      location.set({
        store: input.store,
        room: input.room,
        bin: input.bin,
        barcode: typeof input.barcode === 'string' ? input.barcode.trim() : undefined,
        siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
      });
      await location.save();
    } else {
      location = await LocationModel.create({
        tenantId,
        siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
        store: input.store,
        room: input.room,
        bin: input.bin,
        barcode: typeof input.barcode === 'string' ? input.barcode.trim() : undefined,
      });
    }
  } catch (err) {
    const duplicateField = (err as MongoServerError)?.keyPattern;
    if ((err as MongoServerError)?.code === 11000 && duplicateField?.barcode) {
      throw new InventoryError('Location barcode must be unique per tenant', 409);
    }
    throw err;
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

const ensureLocation = async (
  context: InventoryContext,
  locationId: string,
  session?: ClientSession,
): Promise<LocationDocument> => {
  const query: FilterQuery<LocationDocument> = {
    _id: toObjectId(locationId, 'location id'),
    tenantId: toObjectId(context.tenantId, 'tenant id'),
  };

  if (context.siteId) {
    query.$or = [{ siteId: maybeObjectId(context.siteId) }, { siteId: null }, { siteId: { $exists: false } }];
  }

  const location = await LocationModel.findOne(query, undefined, session ? { session } : undefined);
  if (!location) {
    throw new InventoryError('Location not found', 404);
  }

  if (context.siteId && location.siteId && location.siteId.toString() !== context.siteId) {
    throw new InventoryError('Location not available for this site', 403);
  }
  return location;
};

const ensurePart = async (
  context: InventoryContext,
  partId: Types.ObjectId | string,
  session?: ClientSession,
): Promise<PartDocument> => {
  const query: FilterQuery<PartDocument> = {
    _id: toObjectId(partId, 'part id'),
    tenantId: toObjectId(context.tenantId, 'tenant id'),
  };

  if (context.siteId) {
    query.$or = [{ siteId: maybeObjectId(context.siteId) }, { siteId: null }, { siteId: { $exists: false } }];
  }

  const part = await PartModel.findOne(query, undefined, session ? { session } : undefined);
  if (!part) {
    throw new InventoryError('Part not found', 404);
  }
  if (context.siteId && part.siteId && part.siteId.toString() !== context.siteId) {
    throw new InventoryError('Part not available for this site', 403);
  }
  return part;
};

const buildStockQuery = (
  tenantId: Types.ObjectId,
  partId: Types.ObjectId,
  locationId: Types.ObjectId,
  siteId?: string,
): FilterQuery<StockItemDocument> => {
  const query: FilterQuery<StockItemDocument> = {
    tenantId,
    part: partId,
    location: locationId,
  };

  if (siteId) {
    query.siteId = maybeObjectId(siteId);
  }

  return query;
};

const findTransactionByKey = async (
  tenantId: Types.ObjectId,
  idempotencyKey: string,
  session?: ClientSession,
) =>
  InventoryTransactionModel.findOne(
    { tenantId, idempotencyKey },
    undefined,
    session ? { session } : undefined,
  );

const serializeTransactionRecord = (
  transaction: InventoryTransactionDocument,
): InventoryTransactionRecord => ({
  id: (transaction._id as Types.ObjectId).toString(),
  tenantId: (transaction.tenantId as Types.ObjectId).toString(),
  siteId: transaction.siteId ? (transaction.siteId as Types.ObjectId).toString() : undefined,
  type: transaction.type,
  partId: transaction.part.toString(),
  quantity: transaction.quantity,
  delta: transaction.delta,
  idempotencyKey: transaction.idempotencyKey,
  locationId: transaction.location ? transaction.location.toString() : undefined,
  fromLocationId: transaction.fromLocation ? transaction.fromLocation.toString() : undefined,
  toLocationId: transaction.toLocation ? transaction.toLocation.toString() : undefined,
  onHandQuantity: transaction.locationQuantityAfter,
  fromOnHandQuantity: transaction.fromLocationQuantityAfter,
  toOnHandQuantity: transaction.toLocationQuantityAfter,
  partQuantityAfter: transaction.partQuantityAfter,
  metadata: (transaction.metadata as Record<string, unknown>) ?? undefined,
  createdAt:
    transaction.createdAt instanceof Date
      ? transaction.createdAt.toISOString()
      : new Date().toISOString(),
});

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
  session?: ClientSession,
): Promise<StockHistoryDocument> => {
  const location = await LocationModel.findById(stockItem.location, undefined, session ? { session } : undefined);
  const [history] = await StockHistoryModel.create(
    [
      {
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
      },
    ],
    { session },
  );

  return history;
};

const withIdempotentTransaction = async (
  tenantId: Types.ObjectId,
  idempotencyKey: string,
  session: ClientSession,
  operation: () => Promise<InventoryTransactionDocument>,
): Promise<InventoryTransactionDocument> => {
  const existing = await findTransactionByKey(tenantId, idempotencyKey, session);
  if (existing) return existing;
  return operation();
};

export const receiveInventory = async (
  context: InventoryContext,
  input: ReceiveInventoryInput,
): Promise<InventoryTransactionRecord> => {
  assertRoleLevel(context, 'warehouse-clerk');

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const locationId = toObjectId(input.locationId, 'location id');
  const session = await InventoryTransactionModel.startSession();

  try {
    let transaction: InventoryTransactionDocument | null = null;
    await session.withTransaction(async () => {
      transaction = await withIdempotentTransaction(tenantId, input.idempotencyKey, session, async () => {
        const part = await ensurePart(context, partId, session);
        const location = await ensureLocation(context, locationId.toString(), session);
        const stockQuery = buildStockQuery(tenantId, part._id as Types.ObjectId, location._id as Types.ObjectId, context.siteId);
        let stock = await StockItemModel.findOne(stockQuery, undefined, { session });
        if (!stock) {
          stock = new StockItemModel({ ...stockQuery, quantity: 0 });
        }

        stock.quantity += input.quantity;
        await stock.save({ session });

        part.quantity = Math.max(0, (part.quantity ?? 0) + input.quantity);
        part.lastRestockDate = new Date();
        await part.save({ session });

        await recordStockHistory(context, stock, input.quantity, input.metadata?.reason ?? 'Receive', session);

        const [created] = await InventoryTransactionModel.create(
          [
            {
              tenantId,
              siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
              part: part._id,
              location: location._id,
              type: 'receive',
              quantity: input.quantity,
              delta: input.quantity,
              idempotencyKey: input.idempotencyKey,
              metadata: input.metadata,
              createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
              locationQuantityAfter: stock.quantity,
              partQuantityAfter: part.quantity,
            },
          ],
          { session },
        );

        await logAuditEntry(
          {
            tenantId: context.tenantId,
            module: 'inventory',
            action: 'stock_adjustment',
            entityType: 'InventoryPart',
            entityId: part._id.toString(),
            actorId: context.userId,
            metadata: {
              locationId: location._id.toString(),
              delta: input.delta,
              quantityAfter: stock.quantity,
              partQuantityAfter: part.quantity,
              reason: input.metadata?.reason ?? 'Adjustment',
            },
          },
          session,
        );

        return created;
      });
    });

    if (!transaction) {
      throw new InventoryError('Unable to record transaction', 500);
    }

    return serializeTransactionRecord(transaction);
  } finally {
    await session.endSession();
  }
};

export const issueInventory = async (
  context: InventoryContext,
  input: IssueInventoryInput,
): Promise<InventoryTransactionRecord> => {
  assertRoleLevel(context, 'operator');

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const locationId = toObjectId(input.locationId, 'location id');
  const session = await InventoryTransactionModel.startSession();

  try {
    let transaction: InventoryTransactionDocument | null = null;
    await session.withTransaction(async () => {
      transaction = await withIdempotentTransaction(tenantId, input.idempotencyKey, session, async () => {
        const part = await ensurePart(context, partId, session);
        const location = await ensureLocation(context, locationId.toString(), session);
        const stockQuery = buildStockQuery(tenantId, part._id as Types.ObjectId, location._id as Types.ObjectId, context.siteId);
        const stock = await StockItemModel.findOne(stockQuery, undefined, { session });

        if (!stock) {
          throw new InventoryError('Stock not found for requested location', 404);
        }
        if (stock.quantity < input.quantity) {
          throw new InventoryError('Insufficient stock at requested location', 400);
        }
        if ((part.quantity ?? 0) < input.quantity) {
          throw new InventoryError('Insufficient on-hand quantity for part', 400);
        }

        stock.quantity -= input.quantity;
        await stock.save({ session });

        part.quantity = (part.quantity ?? 0) - input.quantity;
        await part.save({ session });

        await recordStockHistory(context, stock, -input.quantity, input.metadata?.reason ?? 'Issue', session);

        const [created] = await InventoryTransactionModel.create(
          [
            {
              tenantId,
              siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
              part: part._id,
              location: location._id,
              type: 'issue',
              quantity: input.quantity,
              delta: -input.quantity,
              idempotencyKey: input.idempotencyKey,
              metadata: input.metadata,
              createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
              locationQuantityAfter: stock.quantity,
              partQuantityAfter: part.quantity,
            },
          ],
          { session },
        );

        return created;
      });
    });

    if (!transaction) {
      throw new InventoryError('Unable to record transaction', 500);
    }

    return serializeTransactionRecord(transaction);
  } finally {
    await session.endSession();
  }
};

export const adjustInventory = async (
  context: InventoryContext,
  input: AdjustInventoryInput,
): Promise<InventoryTransactionRecord> => {
  assertRoleLevel(context, 'supervisor');

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const locationId = toObjectId(input.locationId, 'location id');
  const session = await InventoryTransactionModel.startSession();

  try {
    let transaction: InventoryTransactionDocument | null = null;
    await session.withTransaction(async () => {
      transaction = await withIdempotentTransaction(tenantId, input.idempotencyKey, session, async () => {
        const part = await ensurePart(context, partId, session);
        const location = await ensureLocation(context, locationId.toString(), session);
        const stockQuery = buildStockQuery(tenantId, part._id as Types.ObjectId, location._id as Types.ObjectId, context.siteId);
        let stock = await StockItemModel.findOne(stockQuery, undefined, { session });

        if (!stock && input.delta < 0) {
          throw new InventoryError('Cannot apply negative adjustment to missing stock', 400);
        }

        if (!stock) {
          stock = new StockItemModel({ ...stockQuery, quantity: 0 });
        }

        const newQuantity = stock.quantity + input.delta;
        if (newQuantity < 0) {
          throw new InventoryError('Adjustment would result in negative stock', 400);
        }

        const newPartQuantity = (part.quantity ?? 0) + input.delta;
        if (newPartQuantity < 0) {
          throw new InventoryError('Adjustment would result in negative on-hand quantity', 400);
        }

        stock.quantity = newQuantity;
        await stock.save({ session });

        part.quantity = newPartQuantity;
        await part.save({ session });

        await recordStockHistory(
          context,
          stock,
          input.delta,
          input.metadata?.reason ?? 'Adjustment',
          session,
        );

        const [created] = await InventoryTransactionModel.create(
          [
            {
              tenantId,
              siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
              part: part._id,
              location: location._id,
              type: 'adjust',
              quantity: Math.abs(input.delta),
              delta: input.delta,
              idempotencyKey: input.idempotencyKey,
              metadata: input.metadata,
              createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
              locationQuantityAfter: stock.quantity,
              partQuantityAfter: part.quantity,
            },
          ],
          { session },
        );

        return created;
      });
    });

    if (!transaction) {
      throw new InventoryError('Unable to record transaction', 500);
    }

    return serializeTransactionRecord(transaction);
  } finally {
    await session.endSession();
  }
};

export const transferInventory = async (
  context: InventoryContext,
  input: TransferInventoryInput,
): Promise<InventoryTransactionRecord> => {
  assertRoleLevel(context, 'supervisor');

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const fromLocationId = toObjectId(input.fromLocationId, 'from location id');
  const toLocationId = toObjectId(input.toLocationId, 'to location id');

  if (fromLocationId.equals(toLocationId)) {
    throw new InventoryError('Source and destination locations must differ', 400);
  }

  const session = await InventoryTransactionModel.startSession();

  try {
    let transaction: InventoryTransactionDocument | null = null;
    await session.withTransaction(async () => {
      transaction = await withIdempotentTransaction(tenantId, input.idempotencyKey, session, async () => {
        const part = await ensurePart(context, partId, session);
        const [fromLocation, toLocation] = await Promise.all([
          ensureLocation(context, fromLocationId.toString(), session),
          ensureLocation(context, toLocationId.toString(), session),
        ]);

        const fromQuery = buildStockQuery(
          tenantId,
          part._id as Types.ObjectId,
          fromLocation._id as Types.ObjectId,
          context.siteId,
        );
        const toQuery = buildStockQuery(
          tenantId,
          part._id as Types.ObjectId,
          toLocation._id as Types.ObjectId,
          context.siteId,
        );

        const fromStock = await StockItemModel.findOne(fromQuery, undefined, { session });
        if (!fromStock) {
          throw new InventoryError('Source stock not found', 404);
        }
        if (fromStock.quantity < input.quantity) {
          throw new InventoryError('Insufficient stock at source location', 400);
        }

        fromStock.quantity -= input.quantity;
        await fromStock.save({ session });

        let toStock = await StockItemModel.findOne(toQuery, undefined, { session });
        if (!toStock) {
          toStock = new StockItemModel({ ...toQuery, quantity: 0 });
        }
        toStock.quantity += input.quantity;
        await toStock.save({ session });

        await recordStockHistory(
          context,
          fromStock,
          -input.quantity,
          `Transfer to ${formatLocationLabel(toLocation)}`,
          session,
        );
        await recordStockHistory(
          context,
          toStock,
          input.quantity,
          `Transfer from ${formatLocationLabel(fromLocation)}`,
          session,
        );

        const [created] = await InventoryTransactionModel.create(
          [
            {
              tenantId,
              siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
              part: part._id,
              fromLocation: fromLocation._id,
              toLocation: toLocation._id,
              type: 'transfer',
              quantity: input.quantity,
              delta: 0,
              idempotencyKey: input.idempotencyKey,
              metadata: input.metadata,
              createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
              fromLocationQuantityAfter: fromStock.quantity,
              toLocationQuantityAfter: toStock.quantity,
              partQuantityAfter: part.quantity,
            },
          ],
          { session },
        );

        return created;
      });
    });

    if (!transaction) {
      throw new InventoryError('Unable to record transaction', 500);
    }

    return serializeTransactionRecord(transaction);
  } finally {
    await session.endSession();
  }
};

export const recordStockCount = async (
  context: InventoryContext,
  input: StockCountInput,
): Promise<InventoryTransactionRecord> => {
  assertRoleLevel(context, 'supervisor');

  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const locationId = toObjectId(input.locationId, 'location id');
  const session = await InventoryTransactionModel.startSession();

  try {
    let transaction: InventoryTransactionDocument | null = null;
    await session.withTransaction(async () => {
      transaction = await withIdempotentTransaction(tenantId, input.idempotencyKey, session, async () => {
        const part = await ensurePart(context, partId, session);
        const location = await ensureLocation(context, locationId.toString(), session);
        const stockQuery = buildStockQuery(tenantId, part._id as Types.ObjectId, location._id as Types.ObjectId, context.siteId);
        let stock = await StockItemModel.findOne(stockQuery, undefined, { session });
        if (!stock) {
          stock = new StockItemModel({ ...stockQuery, quantity: 0 });
        }

        const delta = input.quantity - stock.quantity;
        const newPartQuantity = (part.quantity ?? 0) + delta;
        if (newPartQuantity < 0) {
          throw new InventoryError('Stock count would result in negative on-hand', 400);
        }

        stock.quantity = input.quantity;
        await stock.save({ session });

        part.quantity = newPartQuantity;
        await part.save({ session });

        if (delta !== 0) {
          await recordStockHistory(
            context,
            stock,
            delta,
            input.metadata?.reason ?? 'Stock count',
            session,
          );
        }

        const [created] = await InventoryTransactionModel.create(
          [
            {
              tenantId,
              siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
              part: part._id,
              location: location._id,
              type: 'stock_count',
              quantity: input.quantity,
              delta,
              idempotencyKey: input.idempotencyKey,
              metadata: input.metadata,
              createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
              locationQuantityAfter: stock.quantity,
              partQuantityAfter: part.quantity,
            },
          ],
          { session },
        );

        return created;
      });
    });

    if (!transaction) {
      throw new InventoryError('Unable to record transaction', 500);
    }

    return serializeTransactionRecord(transaction);
  } finally {
    await session.endSession();
  }
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

export const transferStock = async (
  context: InventoryContext,
  input: InventoryTransferInput,
): Promise<InventoryTransfer> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const partId = toObjectId(input.partId, 'part id');
  const fromLocationId = toObjectId(input.fromLocationId, 'from location id');
  const toLocationId = toObjectId(input.toLocationId, 'to location id');

  if (fromLocationId.equals(toLocationId)) {
    throw new InventoryError('Source and destination locations must differ', 400);
  }

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError('Quantity must be greater than zero', 400);
  }

  const session = await StockItemModel.startSession();
  try {
    let transferDoc: ({ _id: Types.ObjectId } & InventoryTransferDocument) | null = null;
    await session.withTransaction(async () => {
      const [part, fromLocation, toLocation] = await Promise.all([
        PartModel.findOne({ _id: partId, tenantId }, undefined, { session }),
        ensureLocation(context, fromLocationId.toString(), session),
        ensureLocation(context, toLocationId.toString(), session),
      ]);

      if (!part) {
        throw new InventoryError('Part not found', 404);
      }

      const sourceQuery: FilterQuery<StockItemDocument> = {
        tenantId,
        part: part._id,
        location: fromLocation._id,
      };
      if (context.siteId) sourceQuery.siteId = maybeObjectId(context.siteId);

      const destinationQuery: FilterQuery<StockItemDocument> = {
        tenantId,
        part: part._id,
        location: toLocation._id,
      };
      if (context.siteId) destinationQuery.siteId = maybeObjectId(context.siteId);

      const fromStock = await StockItemModel.findOne(sourceQuery, undefined, { session });
      if (!fromStock) {
        throw new InventoryError('Source stock not found', 404);
      }
      if (fromStock.quantity < quantity) {
        throw new InventoryError('Insufficient stock at source location', 400);
      }

      fromStock.quantity -= quantity;
      await fromStock.save({ session });

      let toStock = await StockItemModel.findOne(destinationQuery, undefined, { session });
      if (!toStock) {
        toStock = new StockItemModel({ ...destinationQuery, quantity: 0 });
      }
      toStock.quantity += quantity;
      await toStock.save({ session });

      await recordStockHistory(
        context,
        fromStock,
        -quantity,
        `Transfer to ${formatLocationLabel(toLocation)}`,
        session,
      );
      await recordStockHistory(
        context,
        toStock,
        quantity,
        `Transfer from ${formatLocationLabel(fromLocation)}`,
        session,
      );

      const [createdTransfer] = await InventoryTransferModel.create(
        [
          {
            tenantId,
            siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
            part: part._id,
            fromLocation: fromLocation._id,
            toLocation: toLocation._id,
            quantity,
            createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
          },
        ],
        { session },
      );

      transferDoc = createdTransfer;
    });

    if (!transferDoc) {
      throw new InventoryError('Unable to record transfer', 500);
    }

    const persistedTransfer = transferDoc as InventoryTransferDocument & { _id: Types.ObjectId };

    const transfer: InventoryTransfer = {
      id: persistedTransfer._id.toString(),
      tenantId: tenantId.toString(),
      partId: partId.toString(),
      fromLocationId: fromLocationId.toString(),
      toLocationId: toLocationId.toString(),
      quantity,
      createdAt: persistedTransfer.createdAt instanceof Date
        ? persistedTransfer.createdAt.toISOString()
        : new Date().toISOString(),
    };

    if (context.siteId) {
      transfer.siteId = context.siteId;
    }
    if (persistedTransfer.createdBy) {
      transfer.createdBy = persistedTransfer.createdBy.toString();
    }

    return transfer;
  } finally {
    await session.endSession();
  }
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
    createdAt:
      entry.createdAt instanceof Date
        ? entry.createdAt.toISOString()
        : entry.createdAt
          ? new Date(entry.createdAt).toISOString()
          : new Date().toISOString(),
    location: {
      locationId: entry.locationSnapshot.locationId.toString(),
      store: entry.locationSnapshot.store,
      room: entry.locationSnapshot.room,
      bin: entry.locationSnapshot.bin,
    },
    ...(entry.reason ? { reason: entry.reason } : {}),
  }));
};

export const listReorderSuggestions = async (
  context: InventoryContext,
  filters: ReorderSuggestionFilters = {},
): Promise<ReorderSuggestionSummary[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const query: FilterQuery<ReorderSuggestionDocument> = { tenantId };

  const siteFilter = filters.siteId ?? context.siteId;
  if (siteFilter) {
    const siteId = maybeObjectId(siteFilter);
    query.$or = [{ siteId }, { siteId: { $exists: false } }, { siteId: null }];
  }

  if (filters.partId) {
    query.part = toObjectId(filters.partId, 'part id');
  }

  const suggestions = await ReorderSuggestionModel.find(query)
    .sort({ createdAt: -1 })
    .lean<ReorderSuggestionRecord[]>();

  if (!suggestions.length) {
    return [];
  }

  const partIds = suggestions.map((suggestion) => suggestion.part);
  const locationIds = suggestions
    .map((suggestion) => suggestion.targetLocation)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const [parts, locations] = await Promise.all([
    PartModel.find({ tenantId, _id: { $in: partIds } })
      .select('name siteId location minLevel reorderPoint leadTime')
      .lean<PartRecord[]>(),
    locationIds.length
      ? LocationModel.find({ tenantId, _id: { $in: locationIds } })
          .select('store room bin')
          .lean<LocationDocument[]>()
      : [],
  ]);

  const partMap = new Map<string, PartRecord>();
  parts.forEach((part) => partMap.set(part._id.toString(), part));

  const locationMap = new Map<string, LocationDocument>();
  locations.forEach((location) => locationMap.set(location._id.toString(), location));

  return suggestions.map((suggestion) => {
    const partId = suggestion.part.toString();
    const part = partMap.get(partId);
    const location = suggestion.targetLocation
      ? locationMap.get(suggestion.targetLocation.toString())
      : undefined;

    const response: ReorderSuggestionSummary = {
      id: (suggestion._id as Types.ObjectId).toString(),
      partId,
      partName: part?.name ?? 'Unknown part',
      suggestedQty: suggestion.suggestedQty,
      siteId: suggestion.siteId?.toString() ?? part?.siteId?.toString(),
      onHand: suggestion.onHand,
      onOrder: suggestion.onOrder,
      threshold: suggestion.threshold,
      leadTimeDays: suggestion.leadTimeDays,
      source: {
        type: suggestion.source?.type ?? 'low_stock_scan',
        runId: suggestion.source?.runId?.toString(),
        generatedAt: suggestion.source?.generatedAt?.toISOString(),
        criteria: suggestion.source?.criteria,
      },
      createdAt: suggestion.createdAt?.toISOString(),
    };

    if (location) {
      response.location = {
        id: (location._id as Types.ObjectId).toString(),
        store: location.store,
        room: location.room,
        bin: location.bin,
      };
    }

    return response;
  });
};

const buildPartPayload = (input: PartInput): Partial<PartDocument> => {
  const payload: Partial<PartDocument> = {};

  if (typeof input.description === 'string') payload.description = input.description;
  if (typeof input.barcode === 'string') payload.barcode = input.barcode.trim();
  if (typeof input.partNo === 'string') payload.partNo = input.partNo;
  if (typeof input.category === 'string') payload.category = input.category;
  if (typeof input.sku === 'string') payload.sku = input.sku;
  if (typeof input.partNumber === 'string') payload.partNumber = input.partNumber;
  if (typeof input.location === 'string') payload.location = input.location;
  if (typeof input.notes === 'string') payload.notes = input.notes;
  if (typeof input.quantity === 'number') payload.quantity = input.quantity;
  if (typeof input.unitCost === 'number') payload.unitCost = input.unitCost;
  if (typeof input.cost === 'number') payload.cost = input.cost;
  if (input.unit !== undefined) payload.unit = input.unit;
  if (typeof input.minStock === 'number') payload.minStock = input.minStock;
  if (typeof input.minQty === 'number') payload.minQty = input.minQty;
  if (typeof input.maxQty === 'number') payload.maxQty = input.maxQty;
  if (typeof input.minLevel === 'number') payload.minLevel = input.minLevel;
  if (typeof input.maxLevel === 'number') payload.maxLevel = input.maxLevel;
  if (typeof input.reorderPoint === 'number') payload.reorderPoint = input.reorderPoint;
  if (typeof input.reorderQty === 'number') payload.reorderQty = input.reorderQty;
  if (typeof input.reorderThreshold === 'number') payload.reorderThreshold = input.reorderThreshold;
  if (typeof input.leadTime === 'number') payload.leadTime = input.leadTime;
  if (typeof input.autoReorder === 'boolean') payload.autoReorder = input.autoReorder;
  if (Array.isArray(input.assetIds)) {
    payload.assetIds = input.assetIds.map((id) => toObjectId(id, 'asset id'));
  }
  if (Array.isArray(input.pmTemplateIds)) {
    payload.pmTemplateIds = input.pmTemplateIds.map((id) => toObjectId(id, 'template id'));
  }
  if (typeof input.lastRestockDate === 'string') {
    const lastRestockDate = normalizeDate(input.lastRestockDate);
    if (lastRestockDate) {
      payload.lastRestockDate = lastRestockDate;
    }
  }
  if (typeof input.lastOrderDate === 'string') {
    const lastOrderDate = normalizeDate(input.lastOrderDate);
    if (lastOrderDate) {
      payload.lastOrderDate = lastOrderDate;
    }
  }
  if (typeof input.vendorId === 'string') {
    payload.vendor = toObjectId(input.vendorId, 'vendor id');
  } else if (input.vendorId === null) {
    delete payload.vendor;
  }
  return payload;
};

const ensureVendor = async (context: InventoryContext, vendorId: string): Promise<VendorDocument> => {
  const vendor = await VendorModel.findOne({ _id: vendorId, tenantId: context.tenantId });
  if (!vendor) {
    throw new InventoryError('Vendor not found', 404);
  }
  return vendor;
};

type ReorderQuantityInput = Pick<
  PartDocument,
  'reorderQty' | 'minLevel' | 'minStock' | 'quantity' | 'reorderPoint'
>;

export const determineReorderQuantity = (part: ReorderQuantityInput): number => {
  if (part.reorderQty && part.reorderQty > 0) {
    return part.reorderQty;
  }
  const minimumLevel = part.minLevel && part.minLevel > 0 ? part.minLevel : part.minStock;
  if (minimumLevel && minimumLevel > 0) {
    const delta = minimumLevel - part.quantity;
    return delta > 0 ? delta : minimumLevel;
  }
  const diff = part.reorderPoint - part.quantity;
  return diff > 0 ? diff : part.reorderPoint || 1;
};

const triggerAutoReorder = async (context: InventoryContext, part: PartDocument): Promise<void> => {
  if (!part.autoReorder || !part.vendor) {
    return;
  }
  const threshold = part.minLevel && part.minLevel > 0 ? part.minLevel : part.reorderPoint;
  if (part.quantity > threshold) {
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
  try {
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
  } catch (err) {
    const duplicateField = (err as MongoServerError)?.keyPattern;
    if ((err as MongoServerError)?.code === 11000 && duplicateField?.barcode) {
      throw new InventoryError('Barcode must be unique per tenant', 409);
    }
    throw err;
  }
  await triggerAutoReorder(context, part);
  const plainPart = part.toObject() as PartRecord;
  const [refs, stockItems] = await Promise.all([
    resolveReferenceMaps([plainPart]),
    StockItemModel.find({
      tenantId,
      part: part._id,
      ...(context.siteId ? { siteId: maybeObjectId(context.siteId) } : {}),
    }),
  ]);
  const locationIds = stockItems.map((item) => item.location);
  const locations = locationIds.length
    ? await LocationModel.find({ _id: { $in: locationIds } })
    : [];
  const locationMap = new Map(
    locations.map((loc) => [(loc._id as Types.ObjectId).toString(), loc]),
  );

  return serializePart(plainPart, refs, stockItems, locationMap);
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

export const listAlerts = async (
  context: InventoryContext,
  filters: ReorderAlertFilters = {},
): Promise<ReorderAlertList> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const pageRaw = Number(filters.page ?? 1);
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const pageSizeRaw = Number(filters.pageSize ?? 20);
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(100, Math.max(1, pageSizeRaw)) : 20;

  const query: FilterQuery<ReorderAlertDocument> = { tenantId };
  if (context.siteId) {
    query.siteId = maybeObjectId(context.siteId);
  }
  if (filters.siteId) {
    query.siteId = maybeObjectId(filters.siteId);
  }
  if (filters.partId) {
    query.part = toObjectId(filters.partId, 'part id');
  }
  if (filters.status) {
    query.status = filters.status;
  }

  const [alerts, total, openCount] = await Promise.all([
    ReorderAlertModel.find(query)
      .sort({ triggeredAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ReorderAlertDocument[]>(),
    ReorderAlertModel.countDocuments(query),
    ReorderAlertModel.countDocuments({ tenantId, status: 'open' }),
  ]);

  const partIds = Array.from(new Set(alerts.map((alert) => alert.part.toString())));
  const parts = partIds.length
    ? await PartModel.find({ _id: { $in: partIds } }).lean<PartRecord[]>()
    : [];
  const refs = await resolveReferenceMaps(parts);
  const partMap = new Map(parts.map((part) => [part._id.toString(), part]));

  const items: InventoryAlert[] = alerts.map((alert) => {
    const part = partMap.get(alert.part.toString());
    const response: InventoryAlert = {
      id: alert._id.toString(),
      tenantId: alert.tenantId.toString(),
      partId: alert.part.toString(),
      partName: part?.name ?? 'Unknown part',
      quantity: alert.quantity,
      reorderPoint: alert.threshold,
      minLevel: part?.minLevel,
      assetNames:
        part?.assetIds?.map((assetId: Types.ObjectId) => refs.assets.get(assetId.toString()))
          .filter((name): name is string => Boolean(name)) ?? [],
      pmTemplateTitles:
        part?.pmTemplateIds
          ?.map((templateId: Types.ObjectId) => refs.templates.get(templateId.toString()))
          .filter((title): title is string => Boolean(title)) ?? [],
      status: alert.status,
    };

    if (alert.location) {
      response.locationId = alert.location.toString();
    }

    if (part?.siteId || alert.siteId) {
      response.siteId = (alert.siteId ?? part?.siteId)?.toString();
    }
    if (part?.vendor) {
      response.vendorName = refs.vendors.get(part.vendor.toString())?.name;
    }
    if (part?.lastAlertAt || alert.triggeredAt) {
      const lastTriggeredAt = part?.lastAlertAt ?? alert.triggeredAt;
      if (lastTriggeredAt) {
        response.lastTriggeredAt = lastTriggeredAt.toISOString();
      }
    }

    return response;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    sortBy: 'triggeredAt',
    sortDirection: 'desc',
    openCount,
  };
};

export const transitionAlertStatus = async (
  context: InventoryContext,
  alertId: string,
  action: 'approve' | 'skip' | 'resolve',
): Promise<InventoryAlert> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const _id = toObjectId(alertId, 'alert id');
  const alert = await ReorderAlertModel.findOne({ _id, tenantId });
  if (!alert) {
    throw new InventoryError('Alert not found', 404);
  }

  const now = new Date();
  if (action === 'approve') {
    alert.status = 'approved';
    alert.approvedAt = now;
  } else if (action === 'skip') {
    alert.status = 'skipped';
    alert.skippedAt = now;
  } else {
    alert.status = 'resolved';
    alert.resolvedAt = now;
  }

  await alert.save();

  const part = await PartModel.findById(alert.part).lean<PartRecord | null>();
  const refs = part ? await resolveReferenceMaps([part]) : await resolveReferenceMaps([]);

  const response: InventoryAlert = {
    id: alert._id.toString(),
    tenantId: alert.tenantId.toString(),
    partId: alert.part.toString(),
    partName: part?.name ?? 'Unknown part',
    quantity: alert.quantity,
    reorderPoint: alert.threshold,
    minLevel: part?.minLevel,
    assetNames:
      part?.assetIds?.map((assetId: Types.ObjectId) => refs.assets.get(assetId.toString()))
        .filter((name): name is string => Boolean(name)) ?? [],
    pmTemplateTitles:
      part?.pmTemplateIds
        ?.map((templateId: Types.ObjectId) => refs.templates.get(templateId.toString()))
        .filter((title): title is string => Boolean(title)) ?? [],
    status: alert.status,
  };

  if (alert.location) {
    response.locationId = alert.location.toString();
  }
  if (part?.siteId || alert.siteId) {
    response.siteId = (alert.siteId ?? part?.siteId)?.toString();
  }
  if (part?.vendor) {
    response.vendorName = refs.vendors.get(part.vendor.toString())?.name;
  }
  if (part?.lastAlertAt || alert.triggeredAt) {
    const lastTriggeredAt = part?.lastAlertAt ?? alert.triggeredAt;
    if (lastTriggeredAt) {
      response.lastTriggeredAt = lastTriggeredAt.toISOString();
    }
  }

  return response;
};

export const getPartUsageReport = async (
  context: InventoryContext,
  filters: PartUsageFilters = {},
): Promise<PartUsageReport> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const match: FilterQuery<any> = { tenantId, status: 'completed' };

  if (context.siteId) {
    match.siteId = toObjectId(context.siteId, 'site id');
  }

  if (filters.siteIds?.length) {
    match.siteId = { $in: filters.siteIds.map((id) => toObjectId(id, 'site id')) } as any;
  }

  const dateRange: Record<string, Date> = {};
  if (filters.startDate) dateRange.$gte = filters.startDate;
  if (filters.endDate) dateRange.$lte = filters.endDate;
  if (Object.keys(dateRange).length) {
    match.completedAt = dateRange;
  }

  const partFilterSet = filters.partIds?.length ? new Set(filters.partIds) : null;

  const workOrders = await WorkOrder.find(match)
    .select('_id partsUsed completedAt')
    .lean();

  if (!workOrders.length) {
    return {
      summary: { totalQuantity: 0, totalCost: 0, distinctParts: 0, workOrders: 0 },
      parts: [],
    };
  }

  const usage = new Map<
    string,
    {
      partId: string;
      totalQuantity: number;
      providedCost: number;
      missingCostQuantity: number;
      workOrders: Set<string>;
      lastUsedAt?: Date;
    }
  >();

  const completedOrders = new Set<string>();

  workOrders.forEach((order) => {
    const completedAt = order.completedAt ?? undefined;
    if (!Array.isArray(order.partsUsed)) return;
    order.partsUsed.forEach((entry) => {
      const rawId = (entry as { partId?: Types.ObjectId | string }).partId;
      if (!rawId) return;
      const partId = rawId instanceof Types.ObjectId ? rawId : new Types.ObjectId(rawId);
      const key = partId.toString();
      if (partFilterSet && !partFilterSet.has(key)) return;

      const quantity = Number((entry as { qty?: number }).qty ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return;

      const costValue = (entry as { cost?: number }).cost;
      const record =
        usage.get(key) ?? {
          partId: key,
          totalQuantity: 0,
          providedCost: 0,
          missingCostQuantity: 0,
          workOrders: new Set<string>(),
          lastUsedAt: undefined,
        };

      record.totalQuantity += quantity;
      if (typeof costValue === 'number' && Number.isFinite(costValue)) {
        record.providedCost += quantity * costValue;
      } else {
        record.missingCostQuantity += quantity;
      }

      record.workOrders.add(order._id.toString());
      if (completedAt && (!record.lastUsedAt || completedAt > record.lastUsedAt)) {
        record.lastUsedAt = completedAt;
      }

      usage.set(key, record);
      completedOrders.add(order._id.toString());
    });
  });

  if (!usage.size) {
    return {
      summary: { totalQuantity: 0, totalCost: 0, distinctParts: 0, workOrders: 0 },
      parts: [],
    };
  }

  const partIds = Array.from(usage.keys()).map((id) => new Types.ObjectId(id));
  const partDocs = await PartModel.find({ tenantId, _id: { $in: partIds } })
    .select('name partNo partNumber unitCost cost')
    .lean();

  const metadata = new Map<string, { name?: string; partNo?: string; unitCost?: number | null; cost?: number | null }>();
  partDocs.forEach((doc) => {
    metadata.set(doc._id.toString(), {
      name: doc.name,
      partNo: doc.partNo ?? doc.partNumber,
      unitCost: doc.unitCost,
      cost: doc.cost,
    });
  });

  const missingMetaIds = partIds.filter((id) => !metadata.has(id.toString()));
  if (missingMetaIds.length) {
    const legacyItems = await InventoryItem.find({ tenantId, _id: { $in: missingMetaIds } })
      .select('name partNo partNumber unitCost cost')
      .lean();
    legacyItems.forEach((item) => {
      metadata.set(item._id.toString(), {
        name: (item as any).name,
        partNo: (item as any).partNo ?? (item as any).partNumber,
        unitCost: (item as any).unitCost,
        cost: (item as any).cost,
      });
    });
  }

  let totalQuantity = 0;
  let totalCost = 0;

  const parts = Array.from(usage.values()).map((entry) => {
    const meta = metadata.get(entry.partId);
    const unitCost = meta?.unitCost ?? meta?.cost ?? 0;
    const partCost = entry.providedCost + entry.missingCostQuantity * unitCost;

    totalQuantity += entry.totalQuantity;
    totalCost += partCost;

    return {
      partId: entry.partId,
      partName: meta?.name ?? 'Unknown part',
      partNumber: meta?.partNo,
      totalQuantity: entry.totalQuantity,
      totalCost: partCost,
      workOrderCount: entry.workOrders.size,
      lastUsedAt: entry.lastUsedAt?.toISOString(),
      unitCost,
    };
  });

  parts.sort((a, b) => b.totalCost - a.totalCost || b.totalQuantity - a.totalQuantity);

  return {
    summary: {
      totalQuantity,
      totalCost,
      distinctParts: parts.length,
      workOrders: completedOrders.size,
    },
    parts,
  };
};
