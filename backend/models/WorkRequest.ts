/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type WorkRequestStatus = 'new' | 'reviewing' | 'converted' | 'closed';

export interface WorkRequestDocument extends Document {
  _id: Types.ObjectId;
  token: string;
  title: string;
  description?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  location?: string;
  assetTag?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkRequestStatus;
  siteId: Types.ObjectId;
  tenantId: Types.ObjectId;
  requestForm: Types.ObjectId;
  workOrder?: Types.ObjectId;
  photos: Types.Array<string>;
  createdAt?: Date;
  updatedAt?: Date;
}

const workRequestSchema = new Schema<WorkRequestDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    requesterName: { type: String, required: true },
    requesterEmail: { type: String },
    requesterPhone: { type: String },
    location: { type: String },
    assetTag: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewing', 'converted', 'closed'],
      default: 'new',
      index: true,
    },
    photos: [{ type: String }],
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requestForm: { type: Schema.Types.ObjectId, ref: 'RequestForm', required: true, index: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  },
  { timestamps: true },
);

const WorkRequest: Model<WorkRequestDocument> = mongoose.model<WorkRequestDocument>(
  'WorkRequest',
  workRequestSchema,
);

export default WorkRequest;
