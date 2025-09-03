import mongoose, { Schema } from 'mongoose';
const purchaseOrderSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [
        {
            item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
            quantity: { type: Number, required: true },
            uom: { type: Schema.Types.ObjectId, ref: 'unitOfMeasure' },
            unitCost: Number,
            received: { type: Number, default: 0 },
        },
    ],
    status: {
        type: String,
        enum: ['open', 'acknowledged', 'shipped', 'closed'],
        default: 'open',
    },
}, { timestamps: true });
export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
