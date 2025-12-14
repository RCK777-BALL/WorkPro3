/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface RequestRoutingDestination {
  destinationType: 'team' | 'user' | 'queue';
  destinationId?: Types.ObjectId;
  queue?: string;
}

export interface RequestRoutingRuleDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  requestType?: Types.ObjectId;
  assetTag?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  weight?: number;
  destination: RequestRoutingDestination;
  createdAt?: Date;
  updatedAt?: Date;
}

const destinationSchema = new Schema<RequestRoutingDestination>(
  {
    destinationType: { type: String, enum: ['team', 'user', 'queue'], required: true },
    destinationId: { type: Schema.Types.ObjectId },
    queue: { type: String },
  },
  { _id: false },
);

const requestRoutingRuleSchema = new Schema<RequestRoutingRuleDocument>(
  {
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    requestType: { type: Schema.Types.ObjectId, ref: 'RequestType', index: true },
    assetTag: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    category: { type: String },
    weight: { type: Number, default: 0 },
    destination: { type: destinationSchema, required: true },
  },
  { timestamps: true },
);

const RequestRoutingRule: Model<RequestRoutingRuleDocument> = mongoose.model<RequestRoutingRuleDocument>(
  'RequestRoutingRule',
  requestRoutingRuleSchema,
);

export default RequestRoutingRule;
