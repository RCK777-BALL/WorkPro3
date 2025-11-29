/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PMTemplateChecklistItem {
  _id?: Types.ObjectId;
  description: string;
  required?: boolean;
}

export interface PMTemplateRequiredPart {
  _id?: Types.ObjectId;
  partId: Types.ObjectId;
  quantity?: number;
}

export interface PMTemplateAssignment extends Document {
  _id: Types.ObjectId;
  asset: Types.ObjectId;
  interval: string;
  usageMetric?: 'runHours' | 'cycles';
  usageTarget?: number;
  usageLookbackDays?: number;
  checklist: Types.DocumentArray<PMTemplateChecklistItem>;
  requiredParts: Types.DocumentArray<PMTemplateRequiredPart>;
  nextDue?: Date;
  lastGeneratedAt?: Date;
}

export interface PMTemplateDocument extends Document {
  name: string;
  category: string;
  description?: string;
  tasks: string[];
  estimatedMinutes?: number;
  tenantId: Schema.Types.ObjectId;
  siteId?: Types.ObjectId;
  assignments: Types.DocumentArray<PMTemplateAssignment>;
  createdAt?: Date;
  updatedAt?: Date;
}

const checklistSchema = new Schema<PMTemplateChecklistItem>(
  {
    description: { type: String, required: true },
    required: { type: Boolean, default: true },
  },
  { _id: true },
);

const requiredPartSchema = new Schema<PMTemplateRequiredPart>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, default: 1 },
  },
  { _id: true },
);

const assignmentSchema = new Schema<PMTemplateAssignment>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    interval: { type: String, required: true },
    usageMetric: { type: String, enum: ['runHours', 'cycles'], default: null },
    usageTarget: { type: Number },
    usageLookbackDays: { type: Number, default: 30 },
    checklist: { type: [checklistSchema], default: [] },
    requiredParts: { type: [requiredPartSchema], default: [] },
    nextDue: { type: Date },
    lastGeneratedAt: { type: Date },
  },
  { _id: true },
);

const pmTemplateSchema = new Schema<PMTemplateDocument>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    tasks: { type: [String], default: [] },
    estimatedMinutes: { type: Number, default: 0 },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    assignments: { type: [assignmentSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<PMTemplateDocument>('PMTemplate', pmTemplateSchema);
