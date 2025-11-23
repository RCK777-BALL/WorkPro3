/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type OnboardingStepKey = 'site' | 'assets' | 'pmTemplates' | 'team';

export interface TenantOnboardingStepState {
  completed: boolean;
  completedAt?: Date;
}

export interface TenantOnboardingState {
  steps: Record<OnboardingStepKey, TenantOnboardingStepState>;
  lastReminderAt?: Date;
  reminderDismissedAt?: Date;
}

export interface TenantSSOConfig {
  provider?: 'okta' | 'azure';
  issuer?: string;
  clientId?: string;
}

export interface TenantDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug?: string;
  status?: 'active' | 'suspended';
  maxSites?: number;
  sso?: TenantSSOConfig;
  identityProviders?: Types.ObjectId[];
  onboarding?: TenantOnboardingState;
}

const onboardingStepSchema = new Schema<TenantOnboardingStepState>(
  {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false },
);

const onboardingSchema = new Schema<TenantOnboardingState>(
  {
    steps: {
      site: { type: onboardingStepSchema, default: () => ({}) },
      assets: { type: onboardingStepSchema, default: () => ({}) },
      pmTemplates: { type: onboardingStepSchema, default: () => ({}) },
      team: { type: onboardingStepSchema, default: () => ({}) },
    },
    lastReminderAt: { type: Date },
    reminderDismissedAt: { type: Date },
  },
  { _id: false },
);

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    maxSites: { type: Number, min: 1 },
    sso: {
      provider: { type: String, enum: ['okta', 'azure'], required: false },
      issuer: { type: String, required: false },
      clientId: { type: String, required: false },
    },
    identityProviders: [{ type: Schema.Types.ObjectId, ref: 'IdentityProviderConfig' }],
    onboarding: { type: onboardingSchema, required: false },
  },
  { timestamps: true },
);

tenantSchema.index({ slug: 1 }, { unique: true, sparse: true });

const Tenant: Model<TenantDocument> = mongoose.model<TenantDocument>('Tenant', tenantSchema);

export default Tenant;
