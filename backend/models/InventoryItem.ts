/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, Document } from 'mongoose';

// Interface representing an inventory item document
export interface IInventoryItem extends Document {
  _id: Types.ObjectId;                 // <- make required (not optional)
  tenantId: Types.ObjectId;
  name: string;
  qrCode?: string;
  description?: string;
  partNumber?: string;
  partNo?: string;
  sku?: string;
  category?: string;
  quantity: number;                     // kept required in the interface
  unitCost?: number;
  cost?: number;
  unit?: string;
  uom?: Types.ObjectId;
  location?: string;
  store?: string;
  room?: string;
  bin?: string;
  minThreshold?: number;
  minQty?: number;
  maxQty?: number;
  reorderThreshold?: number;
  reorderPoint?: number;
  leadTime?: number;
  lastRestockDate?: Date;
  lastOrderDate?: Date;
  vendor?: Types.ObjectId;
  asset?: Types.ObjectId;
  image?: string;
  siteId?: Types.ObjectId;
  sharedPartId?: Types.ObjectId;
  consume: (amount: number, fromUom: Types.ObjectId) => Promise<IInventoryItem>;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    qrCode: { type: String },
    description: String,
    partNumber: String,
    partNo: { type: String, index: true },
    sku: { type: String, index: true },
    category: String,
    quantity: { type: Number, required: true, default: 0 },   // <- default prevents “possibly undefined”
    unitCost: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    unit: String,
    uom: { type: Schema.Types.ObjectId, ref: 'unitOfMeasure' },
    location: String,
    store: String,
    room: String,
    bin: String,
    minThreshold: { type: Number, default: 0 },
    minQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    lastRestockDate: Date,
    lastOrderDate: Date,
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    image: String,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    sharedPartId: { type: Schema.Types.ObjectId, ref: 'SharedPart' },
  },
  { timestamps: true }
);

inventoryItemSchema.methods.consume = async function (
  this: IInventoryItem,
  amount: number,
  fromUom: Types.ObjectId,
) {
  if (amount <= 0) throw new Error('Amount must be positive');
  let baseAmount = amount;
  if (this.uom && this.uom.toString() !== fromUom.toString()) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not initialized');
    const conv = await db.collection('conversions').findOne({ from: fromUom, to: this.uom });
    if (!conv) throw new Error('Conversion not found');
    baseAmount = amount * conv.factor;
  }
  this.quantity = Math.max(0, this.quantity - baseAmount);
  return this.save();
};

export default mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
