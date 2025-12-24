/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ProcedureTemplateVersionStatus = 'draft' | 'published';

export interface ProcedureTemplateVersionRequiredPart {
  _id?: Types.ObjectId;
  partId: Types.ObjectId;
  quantity?: number;
}

export interface ProcedureTemplateVersionRequiredTool {
  _id?: Types.ObjectId;
  toolName: string;
  quantity?: number;
}

export interface ProcedureTemplateVersionDocument extends Document {
  tenantId: Types.ObjectId;
  templateId: Types.ObjectId;
  versionNumber: number;
  status: ProcedureTemplateVersionStatus;
  durationMinutes: number;
  safetySteps: string[];
  steps?: string[];
  requiredParts: Types.DocumentArray<ProcedureTemplateVersionRequiredPart>;
  requiredTools: Types.DocumentArray<ProcedureTemplateVersionRequiredTool>;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const requiredPartSchema = new Schema<ProcedureTemplateVersionRequiredPart>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const requiredToolSchema = new Schema<ProcedureTemplateVersionRequiredTool>(
  {
    toolName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const procedureTemplateVersionSchema = new Schema<ProcedureTemplateVersionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ProcedureTemplate', required: true, index: true },
    versionNumber: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    safetySteps: { type: [String], required: true },
    steps: { type: [String], default: [] },
    requiredParts: { type: [requiredPartSchema], default: [] },
    requiredTools: { type: [requiredToolSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true, collection: 'procedure_template_versions' },
);

procedureTemplateVersionSchema.index({ tenantId: 1, templateId: 1, versionNumber: 1 }, { unique: true });
procedureTemplateVersionSchema.index({ templateId: 1, status: 1 });

export default mongoose.model<ProcedureTemplateVersionDocument>(
  'ProcedureTemplateVersion',
  procedureTemplateVersionSchema,
);
