/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Model, Types, HydratedDocument, SchemaDefinitionProperty } from 'mongoose';
import { computeEtag } from '../utils/versioning';


export interface WorkOrder {
  _id: Types.ObjectId;
  title: string;
  assetId?: Types.ObjectId;
  description?: string;
  copilotSummary?: string;
  copilotSummaryUpdatedAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status:
    | 'requested'
    | 'assigned'
    | 'in_progress'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'draft'
    | 'pending_approval'
    | 'approved';
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
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
  approvalRequestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  requestedBy?: Types.ObjectId;
  requestedAt?: Date;
  slaDueAt?: Date;
  slaResponseDueAt?: Date;
  slaResolveDueAt?: Date;
  slaRespondedAt?: Date;
  slaResolvedAt?: Date;
  slaBreachAt?: Date;
  slaEscalations?: Types.Array<{
    trigger: 'response' | 'resolve';
    thresholdMinutes?: number;
    escalateTo?: Types.Array<Types.ObjectId>;
    escalatedAt?: Date;
    channel?: 'email' | 'push';
    maxRetries?: number;
    retryBackoffMinutes?: number;
    retryCount?: number;
    nextAttemptAt?: Date;
    templateKey?: string;
  }>;
  assignedTo?: Types.ObjectId;
  assignees: Types.Array<Types.ObjectId>;
  checklists: Types.Array<{
    text: string;
    done: boolean;
    status?: 'not_started' | 'in_progress' | 'done' | 'blocked';
    photos?: string[];
  }>;
  checklist?: Types.Array<{
    id: string;
    text: string;
    type: 'checkbox' | 'numeric' | 'text';
    completedValue?: string | number | boolean;
    required?: boolean;
  }>;
  partsUsed: Types.Array<{ partId: Types.ObjectId; qty: number; cost: number }>;
  signatures: Types.Array<{ by: Types.ObjectId; ts: Date }>;
  permits: Types.Array<Types.ObjectId>;
  requiredPermitTypes: Types.Array<string>;
  permitApprovals?: Types.Array<{
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    note?: string;
  }>;
  lockoutTagout?: Types.Array<{
    category: 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic' | 'chemical' | 'other';
    description: string;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    clearedAt?: Date;
  }>;
  timeSpentMin?: number;
  photos: Types.Array<string>;
  failureCode?: string;
  causeCode?: string;
  actionCode?: string;
  failureCause?: string;
  failureAction?: string;
  failureResult?: string;
  failureModeTags?: Types.Array<string>;

  /** Optional relationships */
  pmTask?: Types.ObjectId;
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  station?: Types.ObjectId;

  teamMemberName?: string;
  importance?: 'low' | 'medium' | 'high' | 'severe';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  tenantId: Types.ObjectId;
  plant?: Types.ObjectId;
  siteId?: Types.ObjectId;

  dueDate?: Date;
  slaHours?: number;
  isSLABreached?: boolean;
  completedAt?: Date;
  downtimeMinutes?: number;
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  miscCost?: number;
  miscellaneousCost?: number;
  totalCost?: number;
  attachments?: Types.Array<{ url: string; name?: string; uploadedBy?: Types.ObjectId; uploadedAt?: Date }>;
  timeline?: Types.Array<{
    label: string;
    notes?: string;
    createdAt: Date;
    createdBy?: Types.ObjectId;
    type?: 'status' | 'comment' | 'approval' | 'sla';
  }>;
  approvalLog?: Types.Array<{ approvedBy?: Types.ObjectId; approvedAt?: Date; note?: string }>;
  version?: number;
  etag?: string;
  lastSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  downtime?: number;
  wrenchTime?: number;
}

export type WorkOrderDocument = HydratedDocument<WorkOrder>;

const tenantRef = {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  } as SchemaDefinitionProperty<Types.ObjectId>;

const workOrderSchema = new Schema<WorkOrder>(
  {
    title: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: [
        'requested',
        'assigned',
        'in_progress',
        'paused',
        'completed',
        'cancelled',
        'draft',
        'pending_approval',
        'approved',
      ],
      default: 'requested',
      index: true,
    },
    type: {
      type: String,
      enum: ['corrective', 'preventive', 'inspection', 'calibration', 'safety'],
      default: 'corrective',
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
    approvalRequestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date },
    slaDueAt: { type: Date },
    slaResponseDueAt: { type: Date },
    slaResolveDueAt: { type: Date },
    slaRespondedAt: { type: Date },
    slaResolvedAt: { type: Date },
    slaBreachAt: { type: Date },
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
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    checklists: [
      {
        text: String,
        done: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'done', 'blocked'],
          default: 'not_started',
        },
        photos: [{ type: String }],
      },
    ],
    checklist: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        type: { type: String, enum: ['checkbox', 'numeric', 'text'], default: 'checkbox' },
        completedValue: { type: Schema.Types.Mixed },
        required: { type: Boolean, default: false },
      },
    ],
    partsUsed: [
      {
        partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
        qty: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },

      },
    ],
    signatures: [
      {
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        ts: { type: Date, default: Date.now },

      },
    ],
    permits: [{ type: Schema.Types.ObjectId, ref: 'Permit' }],
    requiredPermitTypes: [{ type: String }],
    permitApprovals: {
      type: [
        {
          type: { type: String, required: true },
          status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
          approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          approvedAt: { type: Date },
          note: { type: String },
        },
      ],
      default: [],
    },
    lockoutTagout: {
      type: [
        {
          category: {
            type: String,
            enum: ['electrical', 'mechanical', 'hydraulic', 'pneumatic', 'chemical', 'other'],
            default: 'mechanical',
          },
          description: { type: String, required: true },
          verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          verifiedAt: { type: Date },
          clearedAt: { type: Date },
        },
      ],
      default: [],
    },
    timeSpentMin: Number,
    photos: [String],
    failureCode: String,
    causeCode: String,
    actionCode: String,
    failureCause: String,
    failureAction: String,
    failureResult: String,
    failureModeTags: [{ type: String }],
    copilotSummary: { type: String },
    copilotSummaryUpdatedAt: { type: Date },

    /** Optional relationships */
    pmTask: { type: Schema.Types.ObjectId, ref: 'PMTask' },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    line: { type: Schema.Types.ObjectId, ref: 'Line' },
    station: { type: Schema.Types.ObjectId, ref: 'Station' },

    teamMemberName: String,
    importance: {
      type: String,
      enum: ['low', 'medium', 'high', 'severe'],
    },
    complianceProcedureId: String,
    calibrationIntervalDays: Number,

    tenantId: tenantRef,
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    downtimeMinutes: { type: Number, default: 0 },
    laborHours: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    miscCost: { type: Number, default: 0 },
    miscellaneousCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        label: { type: String, required: true },
        notes: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['status', 'comment', 'approval', 'sla'] },
      },
    ],
    approvalLog: [
      {
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    downtime: { type: Number },
    wrenchTime: { type: Number },

    version: { type: Number, default: 1, min: 1 },
    etag: { type: String, index: true },
    lastSyncedAt: { type: Date },

    dueDate: { type: Date },
    slaHours: { type: Number },
    completedAt: Date,
  },
  { timestamps: true }
);

workOrderSchema.pre('save', function handleCosts(next) {
  if (
    this.isModified('laborCost') ||
    this.isModified('partsCost') ||
    this.isModified('miscCost') ||
    this.isModified('miscellaneousCost') ||
    this.isModified('laborHours')
  ) {
    const labor = this.laborCost ?? 0;
    const parts = this.partsCost ?? 0;
    const misc = this.miscellaneousCost ?? this.miscCost ?? 0;
    this.miscCost = this.miscCost ?? this.miscellaneousCost ?? 0;
    this.totalCost = labor + parts + misc;
  }
  next();
});

workOrderSchema.virtual('isSLABreached').get(function isSLABreached(this: WorkOrder) {
  const now = Date.now();
  if (this.slaResolveDueAt && !this.slaResolvedAt && now > new Date(this.slaResolveDueAt).getTime()) {
    return true;
  }
  if (this.slaResponseDueAt && !this.slaRespondedAt && now > new Date(this.slaResponseDueAt).getTime()) {
    return true;
  }
  if (this.dueDate && now > new Date(this.dueDate).getTime()) {
    return true;
  }
  return false;
});

workOrderSchema.pre('save', function updateSlaBreach(next) {
  if (this.isSLABreached && !this.slaBreachAt) {
    this.slaBreachAt = new Date();
  }
  next();
});

workOrderSchema.pre('save', function handleVersioning(next) {
  if (this.isNew) {
    this.version = this.version ?? 1;
  } else if (this.isModified()) {
    this.version = (this.version ?? 0) + 1;
  }

  const updatedAt = this.updatedAt ?? new Date();
  this.etag = computeEtag(this._id, this.version ?? 1, updatedAt);

  if (this.isModified()) {
    this.lastSyncedAt = new Date();
  }

  next();
});

const WorkOrder: Model<WorkOrder> = mongoose.model<WorkOrder>('WorkOrder', workOrderSchema);

export default WorkOrder;


