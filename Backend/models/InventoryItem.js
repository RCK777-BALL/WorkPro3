import mongoose, { Schema } from 'mongoose';
const inventoryItemSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    partNumber: String,
    sku: { type: String, index: true },
    category: String,
    quantity: { type: Number, required: true, default: 0 }, // <- default prevents “possibly undefined”
    unitCost: { type: Number, default: 0 },
    unit: String,
    uom: { type: Schema.Types.ObjectId, ref: 'unitOfMeasure' },
    location: String,
    minThreshold: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    lastRestockDate: Date,
    lastOrderDate: Date,
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    image: String,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    sharedPartId: { type: Schema.Types.ObjectId, ref: 'SharedPart' },
}, { timestamps: true });
inventoryItemSchema.methods.consume = async function (amount, fromUom) {
    if (amount <= 0)
        throw new Error('Amount must be positive');
    let baseAmount = amount;
    if (this.uom && this.uom.toString() !== fromUom.toString()) {
        const conv = await mongoose.connection
            .db
            .collection('conversions')
            .findOne({ from: fromUom, to: this.uom });
        if (!conv)
            throw new Error('Conversion not found');
        baseAmount = amount * conv.factor;
    }
    this.quantity = Math.max(0, this.quantity - baseAmount);
    return this.save();
};
export default mongoose.model('InventoryItem', inventoryItemSchema);
