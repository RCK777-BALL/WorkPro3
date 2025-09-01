import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: String,
  description: String,
  category: String,
  location: String,
  quantity: { type: Number, default: 0 },
  unitCost: Number,
  reorderPoint: Number,
  reorderThreshold: Number,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  lastRestockDate: Date,
  lastOrderDate: Date,
  image: String
}, { timestamps: true });

export default mongoose.model('Inventory', inventorySchema);
