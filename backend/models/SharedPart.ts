/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const sharedPartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    partNumber: String,
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('SharedPart', sharedPartSchema);
