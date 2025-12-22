/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type PMTemplateVersionStatus = 'draft' | 'published';

export interface PMTemplateVersionRequiredPart {
  _id?: Types.ObjectId;
  partId: Types.ObjectId;
  quantity?: number;
}

export interface PMTemplateVersionRequiredTool {
  _id?: Types.ObjectId;
  toolName: string;
  quantity?: number;
}

export interface PMTemplateVersionDocument extends Document {
  templateId: Types.ObjectId;
  versionNumber: number;
  status: PMTemplateVersionStatus;
  durationMinutes: number;
  safetySteps: string[];
  steps?: string[];
  requiredParts: Types.DocumentArray<PMTemplateVersionRequiredPart>;
  requiredTools: Types.DocumentArray<PMTemplateVersionRequiredTool>;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const requiredPartSchema = new Schema<PMTemplateVersionRequiredPart>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const requiredToolSchema = new Schema<PMTemplateVersionRequiredTool>(
  {
    toolName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const pmTemplateVersionSchema = new Schema<PMTemplateVersionDocument>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: 'PMProcedureTemplate', required: true, index: true },
    versionNumber: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    safetySteps: { type: [String], required: true },
    steps: { type: [String], default: [] },
    requiredParts: { type: [requiredPartSchema], default: [] },
    requiredTools: { type: [requiredToolSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true, collection: 'pm_template_versions' },
);

pmTemplateVersionSchema.index({ templateId: 1, versionNumber: 1 }, { unique: true });
pmTemplateVersionSchema.index({ templateId: 1, status: 1 });

export default mongoose.model<PMTemplateVersionDocument>('PMTemplateVersion', pmTemplateVersionSchema);
