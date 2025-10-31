/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PlantDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  location?: string;
  description?: string;
  isActive: boolean;
  organization: string;
  tenantId?: Types.ObjectId;
}

const plantSchema = new Schema<PlantDocument>(
  {
    name: { type: String, required: true },
    location: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    organization: { type: String, default: 'WorkPro CMMS Enterprise' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
  },
  { timestamps: true },
);

plantSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<PlantDocument>('Plant', plantSchema);
