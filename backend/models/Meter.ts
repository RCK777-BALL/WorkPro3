import mongoose from 'mongoose';

const meterSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    currentValue: { type: Number, default: 0 },
    pmInterval: { type: Number, required: true },
    lastWOValue: { type: Number, default: 0 },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Meter', meterSchema);
