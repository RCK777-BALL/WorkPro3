/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  sku?: string;
  barcode?: string;
  partNo?: string;
  description?: string;
  category?: string;
  tags?: string[];
  unit_of_measure?: string;
  partNumber?: string;
  location?: string;
  quantity: number;
  unitCost?: number;
  unit?: string;
  cost?: number;
  minStock?: number;
  minQty?: number;
  maxQty?: number;
  minLevel?: number;
  maxLevel?: number;
  reorderPoint: number;
  reorderQty?: number;
  reorderThreshold?: number;
  leadTime?: number;
  autoReorder: boolean;
  lastCost?: number;
  averageCost?: number;
  vendor?: Types.ObjectId;
  assetIds: Types.ObjectId[];
  pmTemplateIds: Types.ObjectId[];
  lastRestockDate?: Date;
  lastOrderDate?: Date;
  notes?: string;
  lastAlertAt?: Date;
  lastAutoReorderAt?: Date;
  lastAutoPurchaseOrderId?: Types.ObjectId;
  status?: string;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const partSchema = new Schema<PartDocument>(
  {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true, index: true },
  partNo: { type: String, index: true },
  description: String,
  category: String,
  tags: [{ type: String, trim: true }],
    unit_of_measure: { type: String, trim: true },
    partNumber: String,
    location: String,
    quantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    unit: String,
    cost: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    minQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },
    minLevel: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    autoReorder: { type: Boolean, default: false },
    lastCost: { type: Number, default: 0 },
    averageCost: { type: Number, default: 0 },
    vendor: { type: Schema.Types.ObjectId, ref: 'InventoryVendor', index: true },
    assetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    pmTemplateIds: [{ type: Schema.Types.ObjectId, ref: 'PMTask' }],
    lastRestockDate: Date,
    lastOrderDate: Date,
  notes: String,
  lastAlertAt: Date,
  lastAutoReorderAt: Date,
  lastAutoPurchaseOrderId: { type: Schema.Types.ObjectId, ref: 'InventoryPurchaseOrder' },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  deleted_at: { type: Date, default: null, index: true },
  deleted_by: { type: Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
},
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

partSchema.index({ tenantId: 1, sku: 1 }, { unique: true, partialFilterExpression: { deleted_at: null, sku: { $exists: true } } });
partSchema.index({ tenantId: 1, name: 1 });
partSchema.index(
  { tenantId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null, barcode: { $exists: true } } },
);
partSchema.index({ tenantId: 1, status: 1, deleted_at: 1 });
partSchema.index({ tenantId: 1, deleted_at: 1 });

export default model<PartDocument>('InventoryPart', partSchema);
