/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

import type {
  ReportDateRange,
  ReportFilter,
  ReportField,
  ReportTemplateInput,
} from '../shared/reports';

export interface ReportTemplateDoc extends Document {
  name: string;
  description?: string;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy: ReportField[];
  dateRange?: ReportDateRange;
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
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

reportTemplateSchema.index({ tenantId: 1, ownerId: 1, name: 1 }, { unique: false });

export const serializeTemplate = (
  doc: ReportTemplateDoc,
  tenantId?: string,
): ReportTemplateInput & { id: string; ownerId: string; tenantId: string; createdAt?: string; updatedAt?: string } => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description,
  fields: doc.fields,
  filters: doc.filters,
  groupBy: doc.groupBy,
  dateRange: doc.dateRange,
  tenantId: tenantId ?? doc.tenantId.toString(),
  ownerId: doc.ownerId.toString(),
  createdAt: doc.createdAt?.toISOString(),
  updatedAt: doc.updatedAt?.toISOString(),
});

export default mongoose.model<ReportTemplateDoc>('ReportTemplate', reportTemplateSchema);
