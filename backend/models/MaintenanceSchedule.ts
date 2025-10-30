/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type RepeatUnit = 'day' | 'week' | 'month';

export interface MaintenanceScheduleDocument extends Document {
  tenantId: Schema.Types.ObjectId;
  title: string;
  description?: string;
  assetId?: string;
  frequency: string;
  nextDue: Date;
  estimatedDuration?: number;
  instructions?: string;
  type?: string;
  repeatConfig: {
    interval: number;
    unit: RepeatUnit;
    endDate?: Date | null;
    occurrences?: number | null;
  };
  parts: string[];
  lastCompleted?: Date | null;
  lastCompletedBy?: string;
  assignedTo?: string;
}

const MaintenanceScheduleSchema = new Schema<MaintenanceScheduleDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    assetId: { type: String },
    frequency: { type: String, required: true },
    nextDue: { type: Date, required: true },
    estimatedDuration: { type: Number },
    instructions: { type: String },
    type: { type: String },
    repeatConfig: {
      interval: { type: Number, default: 1 },
      unit: { type: String, enum: ['day', 'week', 'month'], default: 'month' },
      endDate: { type: Date },
      occurrences: { type: Number },
    },
    parts: { type: [String], default: [] },
    lastCompleted: { type: Date },
    lastCompletedBy: { type: String },
    assignedTo: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.nextDue instanceof Date) {
          ret.nextDue = ret.nextDue.toISOString();
        }
        if (ret.lastCompleted instanceof Date) {
          ret.lastCompleted = ret.lastCompleted.toISOString();
        }
        if (ret.repeatConfig?.endDate instanceof Date) {
          ret.repeatConfig.endDate = ret.repeatConfig.endDate.toISOString();
        }
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.nextDue instanceof Date) {
          ret.nextDue = ret.nextDue.toISOString();
        }
        if (ret.lastCompleted instanceof Date) {
          ret.lastCompleted = ret.lastCompleted.toISOString();
        }
        if (ret.repeatConfig?.endDate instanceof Date) {
          ret.repeatConfig.endDate = ret.repeatConfig.endDate.toISOString();
        }
      },
    },
  },
);

export default mongoose.model<MaintenanceScheduleDocument>(
  'MaintenanceSchedule',
  MaintenanceScheduleSchema,
);
