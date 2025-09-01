import mongoose, { Schema, Types, Document } from 'mongoose';

interface TransferItem {
  fromItem: Types.ObjectId;
  toItem: Types.ObjectId;
  quantity: number;
  status: 'in-transit' | 'received';
}

export interface ITransferOrder extends Document {
  items: TransferItem[];
  status: 'pending' | 'in-transit' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const transferItemSchema = new Schema<TransferItem>({
  fromItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  toItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ['in-transit', 'received'], default: 'in-transit' }
});

const transferOrderSchema = new Schema<ITransferOrder>({
  items: { type: [transferItemSchema], required: true },
  status: { type: String, enum: ['pending', 'in-transit', 'closed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<ITransferOrder>('TransferOrder', transferOrderSchema);
