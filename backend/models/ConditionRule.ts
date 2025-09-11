/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const conditionRuleSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    metric: { type: String, required: true },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '=='],
      default: '>',
    },
    threshold: { type: Number, required: true },
    workOrderTitle: { type: String, required: true },
    workOrderDescription: String,
    active: { type: Boolean, default: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ConditionRule', conditionRuleSchema);
