/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

import WorkOrder from './WorkOrder';

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
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalSteps?: Types.Array<{
    step: number;
    name: string;
    approver?: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    approvedAt?: Date;
    note?: string;
    required?: boolean;
  }>;
  currentApprovalStep?: number;
  slaResponseDueAt?: Date;
  slaResolveDueAt?: Date;
  slaRespondedAt?: Date;
  slaResolvedAt?: Date;
  slaEscalations?: Types.Array<{
    trigger: 'response' | 'resolve';
    thresholdMinutes?: number;
    escalateTo?: Types.Array<Types.ObjectId>;
    escalatedAt?: Date;
    channel?: 'email' | 'push' | 'sms';
    maxRetries?: number;
    retryBackoffMinutes?: number;
    retryCount?: number;
    nextAttemptAt?: Date;
    templateKey?: string;
  }>;
  siteId: Types.ObjectId;
  tenantId: Types.ObjectId;
  requestForm: Types.ObjectId;
  requestType?: Types.ObjectId;
  category?: string;
  workOrder?: Types.ObjectId;
  photos: Types.Array<string>;
  attachments?: Types.Array<{ key: string; files: string[]; paths: string[] }>;
  routing?: {
    ruleId?: Types.ObjectId;
    destinationType?: 'team' | 'user' | 'queue';
    destinationId?: Types.ObjectId;
    queue?: string;
  };
  decision?: {
    convertedWorkOrderId?: Types.ObjectId;
  };
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
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
    },
    approvalSteps: {
      type: [
        {
          step: { type: Number, required: true },
          name: { type: String, required: true },
          approver: { type: Schema.Types.ObjectId, ref: 'User' },
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'skipped'],
            default: 'pending',
          },
          approvedAt: { type: Date },
          note: { type: String },
          required: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    currentApprovalStep: { type: Number, default: 1 },
    slaResponseDueAt: { type: Date },
    slaResolveDueAt: { type: Date },
    slaRespondedAt: { type: Date },
    slaResolvedAt: { type: Date },
    slaEscalations: {
      type: [
        {
          trigger: { type: String, enum: ['response', 'resolve'], required: true },
          thresholdMinutes: { type: Number },
          escalateTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
          escalatedAt: { type: Date },
          channel: { type: String, enum: ['email', 'push', 'sms'], default: 'email' },
          maxRetries: { type: Number, default: 0 },
          retryBackoffMinutes: { type: Number, default: 30 },
          retryCount: { type: Number, default: 0 },
          nextAttemptAt: { type: Date },
          templateKey: { type: String },
        },
      ],
      default: [],
    },
    photos: [{ type: String }],
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requestForm: { type: Schema.Types.ObjectId, ref: 'RequestForm', required: true, index: true },
    requestType: { type: Schema.Types.ObjectId, ref: 'RequestType', index: true },
    category: { type: String },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    attachments: [
      {
        key: { type: String, required: true },
        files: [{ type: String }],
        paths: [{ type: String }],
      },
    ],
    routing: {
      ruleId: { type: Schema.Types.ObjectId, ref: 'RequestRoutingRule' },
      destinationType: { type: String, enum: ['team', 'user', 'queue'] },
      destinationId: { type: Schema.Types.ObjectId },
      queue: { type: String },
    },
    decision: {
      convertedWorkOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    },
  },
  { timestamps: true },
);

workRequestSchema.pre('save', async function handleAutoConversion(next) {
  if (this.isModified('approvalStatus') && this.approvalStatus === 'approved' && !this.workOrder) {
    try {
      const workOrder = await WorkOrder.create({
        title: this.title,
        description: this.description,
        tenantId: this.tenantId,
        priority: this.priority ?? 'medium',
        status: 'requested',
        type: 'corrective',
        plant: this.siteId,
        siteId: this.siteId,
        requestId: this._id,
      });
      this.workOrder = workOrder._id;
      this.status = 'converted';
    } catch (err) {
      next(err as Error);
      return;
    }
  }
  next();
});

const WorkRequest: Model<WorkRequestDocument> = mongoose.model<WorkRequestDocument>(
  'WorkRequest',
  workRequestSchema,
);

export default WorkRequest;
