/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PMProcedureTemplateDocument extends Document {
  name: string;
  description?: string;
  category?: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  latestPublishedVersion?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const pmProcedureTemplateSchema = new Schema<PMProcedureTemplateDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'PMTemplateCategory', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    latestPublishedVersion: { type: Schema.Types.ObjectId, ref: 'PMTemplateVersion' },
  },
  { timestamps: true, collection: 'pm_procedure_templates' },
);

pmProcedureTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
pmProcedureTemplateSchema.index({ tenantId: 1, latestPublishedVersion: 1 });

export default mongoose.model<PMProcedureTemplateDocument>('PMProcedureTemplate', pmProcedureTemplateSchema);
