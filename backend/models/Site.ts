/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface SiteDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  code?: string;
  slug: string;
  timezone?: string;
  country?: string;
  region?: string;
}

const siteSchema = new Schema<SiteDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    timezone: { type: String, trim: true },
    country: { type: String, trim: true },
    region: { type: String, trim: true },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

siteSchema.index({ tenantId: 1, code: 1 }, { sparse: true });
siteSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

siteSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 64);
  }
  next();
});

// Enforce per-tenant site creation limits using Tenant.maxSites
siteSchema.pre('save', async function (next) {
  const SiteModel = this.constructor as Model<SiteDocument>;
  const tenant = await mongoose.model('Tenant').findById(this.tenantId);
  const max = (tenant as any)?.maxSites ?? Infinity;
  const count = await SiteModel.countDocuments({ tenantId: this.tenantId });
  if (count >= max) {
    return next(new Error('Site limit reached'));
  }
  next();
});

const Site: Model<SiteDocument> = mongoose.model<SiteDocument>('Site', siteSchema);

export default Site;
