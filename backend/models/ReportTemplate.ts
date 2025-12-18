/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { nanoid } from 'nanoid';

import type {
  ReportDateRange,
  ReportFilter,
  ReportField,
  ReportModel,
  ReportVisibility,
  ReportTemplateInput,
} from '../shared/reports';

export interface ReportTemplateDoc extends Omit<Document, 'model'> {
  name: string;
  description?: string;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy: ReportField[];
  dateRange?: ReportDateRange;
  model: ReportModel;
  calculations?: ReportTemplateInput['calculations'];
  visibility?: ReportVisibility;
  shareId?: string;
  tenantId: Types.ObjectId;
  ownerId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const reportFilterSchema = new Schema<ReportFilter>(
  {
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const reportDateRangeSchema = new Schema<ReportDateRange>(
  {
    from: { type: Date },
    to: { type: Date },
  },
  { _id: false },
);

const reportTemplateSchema = new Schema<ReportTemplateDoc>(
  {
    name: { type: String, required: true },
    description: { type: String },
    fields: { type: [String], default: [] },
    filters: { type: [reportFilterSchema], default: [] },
    groupBy: { type: [String], default: [] },
    dateRange: { type: reportDateRangeSchema, required: false },
    model: { type: String, default: 'workOrders' },
    calculations: { type: [Schema.Types.Mixed], default: [] },
    visibility: {
      scope: { type: String, enum: ['private', 'tenant', 'roles'], default: 'private' },
      roles: { type: [String], default: [] },
      _id: false,
    },
    shareId: { type: String, default: nanoid },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

reportTemplateSchema.index({ tenantId: 1, ownerId: 1, name: 1 }, { unique: false });

export const serializeTemplate = (
  doc: ReportTemplateDoc,
  tenantId?: string,
): ReportTemplateInput & {
  id: string;
  ownerId: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
  shareId: string;
} => {
  const serialized: ReportTemplateInput & {
    id: string;
    ownerId: string;
    tenantId: string;
    createdAt?: string;
    updatedAt?: string;
    shareId: string;
  } = {
    id: doc._id.toString(),
    name: doc.name,
    fields: doc.fields,
    filters: doc.filters,
    groupBy: doc.groupBy,
    model: doc.model,
    calculations: doc.calculations,
    visibility: doc.visibility,
    shareId: doc.shareId ?? '',
    tenantId: tenantId ?? doc.tenantId.toString(),
    ownerId: doc.ownerId.toString(),
  };

  if (doc.description !== undefined) {
    serialized.description = doc.description;
  }

  if (doc.dateRange) {
    serialized.dateRange = doc.dateRange;
  }

  if (doc.createdAt) {
    serialized.createdAt = doc.createdAt.toISOString();
  }

  if (doc.updatedAt) {
    serialized.updatedAt = doc.updatedAt.toISOString();
  }

  return serialized;
};

export default mongoose.model<ReportTemplateDoc>('ReportTemplate', reportTemplateSchema);
