/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Asset from '../../../models/Asset';
import PMTask from '../../../models/PMTask';
import type { InventoryAlert, Part as PartResponse, PurchaseOrder as PurchaseOrderResponse, VendorSummary } from '@shared/inventory';
import PartModel, { type PartDocument } from './models/Part';
import VendorModel, { type VendorDocument } from './models/Vendor';
import PurchaseOrderModel, { type PurchaseOrderDocument } from './models/PurchaseOrder';
import type { PartInput, PurchaseOrderInput, VendorInput } from './schemas';
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

const toObjectId = (value: string, label: string): Types.ObjectId => {
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

const serializeVendor = (vendor: VendorDocument): VendorSummary => ({
  id: vendor._id.toString(),
  name: vendor.name,
  contact: vendor.contact?.name ?? vendor.contact?.email ?? vendor.contact?.phone,
  contactName: vendor.contact?.name,
  email: vendor.contact?.email,
  phone: vendor.contact?.phone,
  address: vendor.address,
  leadTimeDays: vendor.leadTimeDays,
  notes: vendor.notes,
  preferredSkus: vendor.preferredSkus,
  partIds: vendor.partsSupplied.map((id) => id.toString()),
});

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

const resolveReferenceMaps = async (parts: Array<ReturnType<typeof PartModel.prototype.toObject>>) => {
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
      ? VendorModel.find({ _id: { $in: Array.from(vendorIds) } }).lean()
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
    vendors: new Map((vendors as VendorDocument[]).map((vendor) => [vendor._id.toString(), serializeVendor(vendor)])),
    assets: new Map((assets as Array<{ _id: Types.ObjectId; name: string }>).map((asset) => [asset._id.toString(), asset.name])),
    templates: new Map(
      (templates as Array<{ _id: Types.ObjectId; title: string }>).map((template) => [
        template._id.toString(),
        template.title,
      ]),
    ),
  };
};

const serializePart = (
  part: ReturnType<typeof PartModel.prototype.toObject>,
  refs: Awaited<ReturnType<typeof resolveReferenceMaps>>,
): PartResponse => ({
  id: part._id.toString(),
  name: part.name,
  description: part.description ?? undefined,
  category: part.category ?? undefined,
  sku: part.sku ?? undefined,
  partNumber: part.partNumber ?? undefined,
  location: part.location ?? undefined,
  quantity: part.quantity,
  unitCost: part.unitCost ?? 0,
  reorderPoint: part.reorderPoint,
  reorderThreshold: part.reorderThreshold ?? undefined,
  reorderQty: part.reorderQty ?? undefined,
  minStock: part.minStock ?? undefined,
  autoReorder: part.autoReorder ?? false,
  vendorId: part.vendor?.toString(),
  vendor: part.vendor ? refs.vendors.get(part.vendor.toString()) : undefined,
  assets: (part.assetIds ?? [])
    .map((assetId) => ({
      id: assetId.toString(),
      name: refs.assets.get(assetId.toString()) ?? 'Unassigned asset',
    }))
    .filter((asset) => asset.id),
  pmTemplates: (part.pmTemplateIds ?? [])
    .map((templateId) => ({
      id: templateId.toString(),
      title: refs.templates.get(templateId.toString()) ?? 'Template',
    }))
    .filter((template) => template.id),
  lastRestockDate: part.lastRestockDate?.toISOString(),
  lastOrderDate: part.lastOrderDate?.toISOString(),
  notes: part.notes ?? undefined,
  alertState: computeAlertState(part),
  lastAutoReorderAt: part.lastAutoReorderAt?.toISOString(),
});

export const listParts = async (context: InventoryContext): Promise<PartResponse[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const parts = await PartModel.find({ tenantId }).lean();
  const refs = await resolveReferenceMaps(parts);
  return parts.map((part) => serializePart(part, refs));
};

const buildPartPayload = (input: PartInput): Partial<PartDocument> => {
  const payload: Partial<PartDocument> = {
    description: input.description,
    category: input.category,
    sku: input.sku,
    partNumber: input.partNumber,
    location: input.location,
    notes: input.notes,
  };

  if (typeof input.quantity === 'number') payload.quantity = input.quantity;
  if (typeof input.unitCost === 'number') payload.unitCost = input.unitCost;
  if (typeof input.minStock === 'number') payload.minStock = input.minStock;
  if (typeof input.reorderPoint === 'number') payload.reorderPoint = input.reorderPoint;
  if (typeof input.reorderQty === 'number') payload.reorderQty = input.reorderQty;
  if (typeof input.reorderThreshold === 'number') payload.reorderThreshold = input.reorderThreshold;
  if (typeof input.autoReorder === 'boolean') payload.autoReorder = input.autoReorder;
  if (input.assetIds) {
    payload.assetIds = input.assetIds.map((id) => toObjectId(id, 'asset id'));
  }
  if (input.pmTemplateIds) {
    payload.pmTemplateIds = input.pmTemplateIds.map((id) => toObjectId(id, 'template id'));
  }
  payload.lastRestockDate = normalizeDate(input.lastRestockDate);
  payload.lastOrderDate = normalizeDate(input.lastOrderDate);
  if (input.vendorId) {
    payload.vendor = toObjectId(input.vendorId, 'vendor id');
  } else if (input.vendorId === null) {
    payload.vendor = undefined;
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
    part.lastAutoPurchaseOrderId = doc._id;
    part.lastAlertAt = now;
    await part.save();
  } catch (err) {
    logger.error('Failed to auto-reorder part %s: %s', part._id.toString(), err);
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
  const refs = await resolveReferenceMaps([part.toObject()]);
  return serializePart(part.toObject(), refs);
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
    address: input.address,
    notes: input.notes,
    leadTimeDays: input.leadTimeDays,
    preferredSkus: input.preferredSkus ?? [],
    contact: {
      name: input.contactName,
      email: input.contactEmail,
      phone: input.contactPhone,
    },
  };
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
      .select('name sku'),
  ]);
  const partMap = new Map(parts.map((part) => [part._id.toString(), part.name]));
  return {
    id: po._id.toString(),
    vendor: vendor ? serializeVendor(vendor) : undefined,
    status: po.status,
    autoGenerated: po.autoGenerated,
    notes: po.notes ?? undefined,
    expectedDate: po.expectedDate?.toISOString(),
    createdAt: po.createdAt?.toISOString() ?? new Date().toISOString(),
    items: po.items.map((item) => ({
      partId: item.part.toString(),
      partName: partMap.get(item.part.toString()) ?? 'Part',
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
};

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
  }));
  const po = await PurchaseOrderModel.create({
    tenantId,
    siteId: context.siteId ? maybeObjectId(context.siteId) : undefined,
    vendor: vendor._id,
    notes: input.notes,
    expectedDate: normalizeDate(input.expectedDate),
    autoGenerated: input.autoGenerated ?? false,
    items,
  });
  return serializePurchaseOrder(po);
};

export const listAlerts = async (context: InventoryContext): Promise<InventoryAlert[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const parts = await PartModel.find({ tenantId, $expr: { $lte: ['$quantity', '$reorderPoint'] } }).lean();
  const refs = await resolveReferenceMaps(parts);
  return parts.map((part) => ({
    partId: part._id.toString(),
    partName: part.name,
    quantity: part.quantity,
    reorderPoint: part.reorderPoint,
    vendorName: part.vendor ? refs.vendors.get(part.vendor.toString())?.name : undefined,
    assetNames: (part.assetIds ?? [])
      .map((assetId) => refs.assets.get(assetId.toString()))
      .filter((name): name is string => Boolean(name)),
    pmTemplateTitles: (part.pmTemplateIds ?? [])
      .map((templateId) => refs.templates.get(templateId.toString()))
      .filter((title): title is string => Boolean(title)),
    lastTriggeredAt: part.lastAlertAt?.toISOString(),
  }));
};
