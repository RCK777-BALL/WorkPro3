/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type ChecklistInputType = 'boolean' | 'text' | 'number' | 'choice';

export interface ChecklistItem {
  id: string;
  prompt: string;
  type: ChecklistInputType;
  required?: boolean;
  helpText?: string;
  options?: string[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface InspectionTemplateDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  name: string;
  description?: string | null;
  version: number;
  categories: string[];
  retentionDays?: number | null;
  sections: ChecklistSection[];
  createdBy?: Types.ObjectId | null;
  updatedAt: Date;
  createdAt: Date;
}

const checklistItemSchema = new Schema<ChecklistItem>(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    type: { type: String, enum: ['boolean', 'text', 'number', 'choice'], required: true },
    required: { type: Boolean, default: false },
    helpText: { type: String },
    options: { type: [String], default: void 0 },
  },
  { _id: false },
);

const checklistSectionSchema = new Schema<ChecklistSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    items: { type: [checklistItemSchema], default: [] },
  },
  { _id: false },
);

const inspectionTemplateSchema = new Schema<InspectionTemplateDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true },
    description: { type: String },
    version: { type: Number, default: 1 },
    categories: { type: [String], default: [] },
    retentionDays: { type: Number },
    sections: { type: [checklistSectionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

inspectionTemplateSchema.index({ tenantId: 1, name: 1, siteId: 1 });

const InspectionTemplate: Model<InspectionTemplateDocument> =
  (mongoose.models.InspectionTemplate as Model<InspectionTemplateDocument>) ||
  mongoose.model<InspectionTemplateDocument>('InspectionTemplate', inspectionTemplateSchema);

export default InspectionTemplate;
