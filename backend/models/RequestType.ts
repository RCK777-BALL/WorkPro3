/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type RequestFieldType = 'text' | 'textarea' | 'select' | 'number' | 'checkbox';

export interface RequestFieldDefinition {
  key: string;
  label: string;
  type?: RequestFieldType;
  required?: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface RequestAttachmentDefinition {
  key: string;
  label: string;
  required?: boolean;
  accept?: string[];
  maxFiles?: number;
}

export interface RequestTypeDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  category: string;
  description?: string;
  requiredFields: Types.Array<string>;
  fields: Types.Array<RequestFieldDefinition>;
  attachments: Types.Array<RequestAttachmentDefinition>;
  defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

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

const requestTypeSchema = new Schema<RequestTypeDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String },
    requiredFields: [{ type: String, required: true }],
    fields: { type: [fieldDefinitionSchema], default: [] },
    attachments: { type: [attachmentDefinitionSchema], default: [] },
    defaultPriority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  },
  { timestamps: true },
);

const RequestType: Model<RequestTypeDocument> = mongoose.model<RequestTypeDocument>('RequestType', requestTypeSchema);

export default RequestType;
