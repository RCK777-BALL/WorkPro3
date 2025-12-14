/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema } from 'mongoose';
import type { RequestAttachmentDefinition, RequestFieldDefinition } from './RequestType';

const fieldDefinitionSchema = new Schema<RequestFieldDefinition>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'textarea', 'select', 'number', 'checkbox'], default: 'text' },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    validation: {
      minLength: { type: Number },
      maxLength: { type: Number },
      pattern: { type: String },
    },
  },
  { _id: false },
);

const attachmentDefinitionSchema = new Schema<RequestAttachmentDefinition>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    accept: [{ type: String }],
    maxFiles: { type: Number, default: 1 },
  },
  { _id: false },
);

export interface RequestFormSchema {
  fields?: RequestFieldDefinition[];
  attachments?: RequestAttachmentDefinition[];
}

const requestFormSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: 'Request form' },
    description: { type: String },
    requestType: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestType' },
    schema: { type: mongoose.Schema.Types.Mixed, required: true },
    fields: { type: [fieldDefinitionSchema], default: [] },
    attachments: { type: [attachmentDefinitionSchema], default: [] },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
  },
  { timestamps: true },
);

export default mongoose.model('RequestForm', requestFormSchema);
