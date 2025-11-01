/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface AssetDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  type: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  location?: string;
  departmentId?: Types.ObjectId;
  department?: string;
  line?: string;
  station?: string;
  lineId?: Types.ObjectId;
  stationId?: Types.ObjectId;
  tenantId: Types.ObjectId;
  plant: Types.ObjectId;
  siteId?: Types.ObjectId;
  notes?: string;
  status?: string;
  serialNumber?: string;
  description?: string;
  modelName?: string;
  manufacturer?: string;
  purchaseDate?: Date;
  installationDate?: Date;
  lastServiced?: Date;
  criticality?: string;
  documents?: Types.Array<Types.ObjectId>;
}

const assetSchema = new Schema<AssetDoc>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Electrical', 'Mechanical', 'Tooling', 'Interface'],
      required: true,
    },
    location: { type: String, required: false },
    notes: { type: String, default: '' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    department: { type: String },
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
    lastServiced: { type: Date },
    line: { type: String },
    station: { type: String },
    lineId: { type: Schema.Types.ObjectId, ref: 'Line', index: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', index: true },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    plant: {
      type: Schema.Types.ObjectId,
      ref: 'Plant',
      required: true,
      index: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
    criticality: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true }
);

assetSchema.pre('validate', function (next) {
  if (!this.plant && this.siteId) {
    this.plant = this.siteId as Types.ObjectId;
  }
  next();
});

export default mongoose.model<AssetDoc>('Asset', assetSchema);
