/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PlantDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  location?: string;
  description?: string;
  isActive: boolean;
  organization: string;
  tenantId?: Types.ObjectId;
}

const plantSchema = new Schema<PlantDoc>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    organization: { type: String, default: 'WorkPro CMMS Enterprise' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
  },
  { timestamps: true },
);

export default mongoose.model<PlantDoc>('Plant', plantSchema);
