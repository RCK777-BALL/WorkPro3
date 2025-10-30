/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type MaintenanceScheduleRepeatUnit = 'day' | 'week' | 'month';

export interface MaintenanceScheduleRepeatConfig {
  interval: number;
  unit: MaintenanceScheduleRepeatUnit;
  endDate?: Date;
  occurrences?: number;
}

export interface MaintenanceScheduleDocument extends Document {
  tenantId: Schema.Types.ObjectId;
  siteId?: Schema.Types.ObjectId;
  title: string;
  description?: string;
  assetId?: string;
  frequency: string;
  nextDue: Date;
  estimatedDuration: number;
  instructions?: string;
  type: string;
  repeatConfig: MaintenanceScheduleRepeatConfig;
  parts: string[];
  lastCompleted?: Date;
  lastCompletedBy?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceScheduleSchema = new Schema<MaintenanceScheduleDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    title: { type: String, required: true },
    description: { type: String },
    assetId: { type: String },
    frequency: { type: String, required: true },
    nextDue: { type: Date, required: true },
    estimatedDuration: { type: Number, required: true, min: 0 },
    instructions: { type: String },
    type: { type: String, required: true },
    repeatConfig: {
      interval: { type: Number, required: true, min: 1 },
      unit: { type: String, enum: ['day', 'week', 'month'], required: true },
      endDate: { type: Date },
      occurrences: { type: Number, min: 1 },
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
      versionKey: false,
      transform: (_doc, ret: Record<string, any>) => {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        if (ret.tenantId) {
          ret.tenantId = ret.tenantId.toString();
        }
        if (ret.siteId) {
          ret.siteId = ret.siteId.toString();
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, any>) => {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        return ret;
      },
    },
  },
);

const MaintenanceSchedule = mongoose.model<MaintenanceScheduleDocument>(
  'MaintenanceSchedule',
  MaintenanceScheduleSchema,
);

export default MaintenanceSchedule;
