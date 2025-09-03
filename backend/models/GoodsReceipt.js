import mongoose, { Schema } from 'mongoose';
const goodsReceiptSchema = new Schema({
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
}, { timestamps: true });
export default mongoose.model('GoodsReceipt', goodsReceiptSchema);
