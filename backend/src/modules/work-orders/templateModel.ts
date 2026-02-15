/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types } from 'mongoose';

export interface WorkOrderTemplate {
  name: string;
  description?: string;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  version?: number;
  defaults?: {
    priority?: string;
    type?: string;
    assignedTo?: Types.ObjectId;
    checklists?: { text: string; required?: boolean }[];
    parts?: { partId: Types.ObjectId; qty?: number }[];
    status?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const templateSchema = new Schema<WorkOrderTemplate>(
  {
  name: { type: String, required: true },
  description: { type: String },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  version: { type: Number, default: 1 },
  defaults: {
      priority: { type: String },
      type: { type: String },
      assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
      checklists: [
        {
          text: { type: String, required: true },
          required: { type: Boolean, default: false },
        },
      ],
      parts: [
        {
          partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
          qty: { type: Number, default: 1 },
        },
      ],
      status: { type: String },
    },
  },
  { timestamps: true }
);

templateSchema.pre('save', function bumpVersion() {
  if (!this.isNew && this.isModified()) {
    this.version = (this.version ?? 1) + 1;
  }
});

const WorkOrderTemplateModel = mongoose.model<WorkOrderTemplate>('WorkOrderTemplate', templateSchema);

export default WorkOrderTemplateModel;
