/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface AssetDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  type: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  qrCode?: string;
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
  warrantyStart?: Date;
  warrantyEnd?: Date;
  purchaseCost?: number;
  expectedLifeMonths?: number;
  replacementDate?: Date;
  installationDate?: Date;
  lastServiced?: Date;
  lastInspection?: {
    recordId?: Types.ObjectId;
    templateName?: string;
    status?: 'draft' | 'in-progress' | 'completed' | 'archived';
    completedAt?: Date;
    summary?: string;
  };
  criticality?: string;
  documents?: Types.Array<Types.ObjectId>;
  pmTemplateIds?: Types.Array<Types.ObjectId>;
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
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
    warrantyStart: { type: Date },
    warrantyEnd: { type: Date },
    purchaseCost: { type: Number, min: 0 },
    expectedLifeMonths: { type: Number, min: 1 },
    replacementDate: { type: Date },
    installationDate: { type: Date },
    lastServiced: { type: Date },
    line: { type: String },
    station: { type: String },
    lineId: { type: Schema.Types.ObjectId, ref: 'Line', index: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', index: true },
    qrCode: { type: String },
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
    lastInspection: {
      recordId: { type: Schema.Types.ObjectId, ref: 'InspectionRecord' },
      templateName: { type: String },
      status: { type: String, enum: ['draft', 'in-progress', 'completed', 'archived'] },
      completedAt: { type: Date },
      summary: { type: String },
      _id: false,
    },
    criticality: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    pmTemplateIds: [{ type: Schema.Types.ObjectId, ref: 'PmTask', index: true }],
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

assetSchema.pre('validate', function (this: AssetDoc) {
  if (!this.plant && this.siteId) {
    this.plant = this.siteId as Types.ObjectId;
  }
});

assetSchema.index({ tenantId: 1, plant: 1, name: 1 });
assetSchema.index({ tenantId: 1, departmentId: 1 });
assetSchema.index({ tenantId: 1, lineId: 1 });
assetSchema.index({ tenantId: 1, stationId: 1 });
assetSchema.index({ tenantId: 1, siteId: 1 });

export default mongoose.model<AssetDoc>('Asset', assetSchema);
