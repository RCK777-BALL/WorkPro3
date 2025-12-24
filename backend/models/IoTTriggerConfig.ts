/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IoTTriggerConfigDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  asset?: Types.ObjectId;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  procedureTemplateId: Types.ObjectId;
  cooldownMinutes?: number;
  lastTriggeredAt?: Date;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ioTTriggerConfigSchema = new Schema<IoTTriggerConfigDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    metric: { type: String, required: true, index: true },
    operator: { type: String, enum: ['>', '<', '>=', '<=', '=='], required: true },
    threshold: { type: Number, required: true },
    procedureTemplateId: { type: Schema.Types.ObjectId, ref: 'ProcedureTemplate', required: true },
    cooldownMinutes: { type: Number, default: 15 },
    lastTriggeredAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'iot_trigger_configs' },
);

ioTTriggerConfigSchema.index({ tenantId: 1, asset: 1, metric: 1, active: 1 });

export default mongoose.model<IoTTriggerConfigDocument>('IoTTriggerConfig', ioTTriggerConfigSchema);
