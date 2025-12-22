/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PMTemplateCategoryDocument extends Document {
  name: string;
  description?: string;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const pmTemplateCategorySchema = new Schema<PMTemplateCategoryDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  },
  { timestamps: true, collection: 'pm_template_categories' },
);

pmTemplateCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<PMTemplateCategoryDocument>('PMTemplateCategory', pmTemplateCategorySchema);
