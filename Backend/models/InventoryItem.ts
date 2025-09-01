import mongoose, { Schema, Types, Model, Document } from 'mongoose';

// Interface representing an inventory item document
export interface IInventoryItem extends Document {
  _id: Types.ObjectId;                 // <- make required (not optional)
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  partNumber?: string;
  sku?: string;
  category?: string;
  quantity: number;                     // kept required in the interface
  unitCost?: number;
  unit?: string;
  location?: string;
  minThreshold?: number;
  reorderThreshold?: number;
  reorderPoint?: number;
  lastRestockDate?: Date;
  lastOrderDate?: Date;
  vendor?: Types.ObjectId;
  asset?: Types.ObjectId;
  image?: string;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    partNumber: String,
    sku: { type: String, index: true },
    category: String,
    quantity: { type: Number, required: true, default: 0 },   // <- default prevents “possibly undefined”
    unitCost: { type: Number, default: 0 },
    unit: String,
    location: String,
    minThreshold: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    lastRestockDate: Date,
    lastOrderDate: Date,
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    image: String,
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
