/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface InventoryTransferDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | undefined;
  part: Types.ObjectId;
  fromLocation: Types.ObjectId;
  toLocation: Types.ObjectId;
  quantity: number;
  createdBy?: Types.ObjectId | undefined;
  createdAt: Date;
}

const inventoryTransferSchema = new Schema<InventoryTransferDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    fromLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', required: true },
    toLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', required: true },
    quantity: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default model<InventoryTransferDocument>('InventoryTransfer', inventoryTransferSchema);
