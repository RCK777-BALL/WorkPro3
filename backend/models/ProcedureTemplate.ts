/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ProcedureTemplateDocument extends Document {
  name: string;
  description?: string;
  category?: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  latestPublishedVersion?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const procedureTemplateSchema = new Schema<ProcedureTemplateDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'PMTemplateCategory', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    latestPublishedVersion: { type: Schema.Types.ObjectId, ref: 'ProcedureTemplateVersion' },
  },
  { timestamps: true, collection: 'procedure_templates' },
);

procedureTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
procedureTemplateSchema.index({ tenantId: 1, latestPublishedVersion: 1 });

export default mongoose.model<ProcedureTemplateDocument>('ProcedureTemplate', procedureTemplateSchema);
