/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model('Vendor', vendorSchema);
