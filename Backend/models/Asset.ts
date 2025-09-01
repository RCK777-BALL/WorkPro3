import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Electrical', 'Mechanical', 'Tooling', 'Interface'],
      required: true,
    },
    location: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    status: {
      type: String,
      enum: ['Active', 'Offline', 'In Repair'],
      default: 'Active',
    },
    serialNumber: { type: String },
    description: { type: String },
    modelName: { type: String },
    manufacturer: { type: String },
    purchaseDate: { type: Date },
    installationDate: { type: Date },
    lineId: mongoose.Schema.Types.ObjectId,
    stationId: mongoose.Schema.Types.ObjectId,
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    criticality: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    documents: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Asset', assetSchema);
