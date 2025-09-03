import mongoose, { Schema } from 'mongoose';
const transferItemSchema = new Schema({
    fromItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    toItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ['in-transit', 'received'], default: 'in-transit' }
});
const transferOrderSchema = new Schema({
    items: { type: [transferItemSchema], required: true },
    status: { type: String, enum: ['pending', 'in-transit', 'closed'], default: 'pending' }
}, { timestamps: true });
export default mongoose.model('TransferOrder', transferOrderSchema);
