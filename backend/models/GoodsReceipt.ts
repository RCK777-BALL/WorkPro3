/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IGoodsReceiptItem {
  item: Types.ObjectId;
  quantity: number;
  uom?: Types.ObjectId;
}

export interface IGoodsReceipt extends Document {
  tenantId: Types.ObjectId;
  purchaseOrder: Types.ObjectId;
  items: IGoodsReceiptItem[];
  receiptDate: Date;
}

const goodsReceiptSchema = new Schema<IGoodsReceipt>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true },
        uom: { type: Schema.Types.ObjectId, ref: 'unitOfMeasure' },
      },
    ],
    receiptDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IGoodsReceipt>('GoodsReceipt', goodsReceiptSchema);
