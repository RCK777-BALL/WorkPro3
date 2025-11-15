/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ExecutiveReportScheduleDoc extends Document {
  tenantId: Types.ObjectId;
  enabled: boolean;
  cron: string;
  timezone: string;
  recipients: string[];
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'error';
  lastRunError?: string;
}

const executiveReportScheduleSchema = new Schema<ExecutiveReportScheduleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true, unique: true },
    enabled: { type: Boolean, default: true },
    cron: { type: String, default: '0 9 1 * *' },
    timezone: { type: String, default: 'UTC' },
    recipients: { type: [String], default: [] },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ['success', 'error'], default: undefined },
    lastRunError: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<ExecutiveReportScheduleDoc>('ExecutiveReportSchedule', executiveReportScheduleSchema);
