/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type OnboardingStepKey = 'site' | 'departments' | 'assets' | 'pmTemplates' | 'users';

export interface TenantOnboardingStepState {
  completed: boolean;
  completedAt?: Date | undefined;
}

export interface TenantOnboardingState {
  steps: Record<OnboardingStepKey, TenantOnboardingStepState>;
  lastReminderAt?: Date | undefined;
  reminderDismissedAt?: Date | undefined;
}

export interface TenantSSOConfig {
  provider?: 'okta' | 'azure' | undefined;
  issuer?: string | undefined;
  clientId?: string | undefined;
}

export interface TenantDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  domain?: string | undefined;
  branding?: {
    logoUrl?: string | undefined;
    primaryColor?: string | undefined;
    accentColor?: string | undefined;
  } | undefined;
  slug?: string | undefined;
  status?: 'active' | 'suspended' | undefined;
  maxSites?: number | undefined;
  sso?: TenantSSOConfig | undefined;
  identityProviders?: Types.ObjectId[] | undefined;
  onboarding?: TenantOnboardingState | undefined;
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
      departments: { type: onboardingStepSchema, default: () => ({}) },
      assets: { type: onboardingStepSchema, default: () => ({}) },
      pmTemplates: { type: onboardingStepSchema, default: () => ({}) },
      users: { type: onboardingStepSchema, default: () => ({}) },
    },
    lastReminderAt: { type: Date },
    reminderDismissedAt: { type: Date },
  },
  { _id: false },
);

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, required: true },
    domain: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    branding: {
      logoUrl: { type: String },
      primaryColor: { type: String },
      accentColor: { type: String },
    },
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



const Tenant: Model<TenantDocument> = mongoose.model<TenantDocument>('Tenant', tenantSchema);

export default Tenant;
