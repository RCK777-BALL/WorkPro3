/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const workRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    locationText: String,
    description: { type: String, required: true },
    contact: { type: String, required: true },
    status: {
      type: String,
      enum: ['new', 'closed'],
      default: 'new',
    },
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model('WorkRequest', workRequestSchema);
