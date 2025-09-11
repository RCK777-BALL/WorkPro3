/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Enforce per-tenant site creation limits using Tenant.maxSites
siteSchema.pre('save', async function (next) {
  const Site = this.constructor as mongoose.Model<any>;
  const tenant = await mongoose.model('Tenant').findById(this.tenantId);
  const max = (tenant as any)?.maxSites ?? Infinity;
  const count = await Site.countDocuments({ tenantId: this.tenantId });
  if (count >= max) {
    return next(new Error('Site limit reached'));
  }
  next();
});

export default mongoose.model('Site', siteSchema);
