/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

import WorkOrder from './WorkOrder';

export type WorkRequestStatus =
  | 'new'
  | 'reviewing'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'closed'
  | 'deleted';

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
  asset?: Types.ObjectId;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkRequestStatus;
  rejectionReason?: string;
  triagedBy?: Types.ObjectId;
  triagedAt?: Date;
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
  tags?: Types.Array<string>;
  decision?: {
    status?: 'accepted' | 'rejected';
    decidedBy?: Types.ObjectId;
    decidedAt?: Date;
    note?: string;
    reason?: string;
    convertedWorkOrderId?: Types.ObjectId;
  };
  audit?: {
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    deletedBy?: Types.ObjectId;
    deletedAt?: Date;
  };
  routing?: {
    ruleId?: Types.ObjectId;
    destinationType?: 'team' | 'user' | 'queue';
    destinationId?: Types.ObjectId;
    queue?: string;
  };
  deletedAt?: Date;
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
      enum: ['new', 'reviewing', 'accepted', 'rejected', 'converted', 'closed', 'deleted'],
      default: 'new',
      index: true,
    },
    rejectionReason: { type: String },
    triagedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    triagedAt: { type: Date },
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
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requestForm: { type: Schema.Types.ObjectId, ref: 'RequestForm', required: true, index: true },
    requestType: { type: Schema.Types.ObjectId, ref: 'RequestType', index: true },
    category: { type: String },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    tags: [{ type: String, trim: true }],
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
      status: { type: String, enum: ['accepted', 'rejected'] },
      decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      decidedAt: { type: Date },
      note: { type: String },
      reason: { type: String },
      convertedWorkOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    },
    audit: {
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      deletedAt: { type: Date },
    },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

workRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
workRequestSchema.index({ tenantId: 1, requestType: 1, createdAt: -1 });
workRequestSchema.index({ tenantId: 1, siteId: 1, createdAt: -1 });
workRequestSchema.index({ tenantId: 1, workOrder: 1 });
workRequestSchema.index({ title: 'text', description: 'text', category: 'text' });

workRequestSchema.pre('save', async function handleAutoConversion() {
  if (this.isModified('approvalStatus') && this.approvalStatus === 'approved' && !this.workOrder) {
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
  }
});

const WorkRequest: Model<WorkRequestDocument> = mongoose.model<WorkRequestDocument>(
  'WorkRequest',
  workRequestSchema,
);

export default WorkRequest;
