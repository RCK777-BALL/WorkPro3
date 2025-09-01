import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    maxSites: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export default mongoose.model('Tenant', tenantSchema);
