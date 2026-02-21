/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types, type SchemaDefinitionProperty } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, UserRole } from '../types/auth';
export type { UserRole } from '../types/auth';

// Number of bcrypt salt rounds. Increasing this value strengthens password hashes
// but slows down hashing, impacting performance. Adjust here to change the
// hashing cost globally.
export const SALT_ROUNDS = 10;

// ✅ Interface for a user document
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  plant?: Types.ObjectId;
  employeeId: string;
  employeeNumber?: string;
  trade?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Facilities' | 'Automation' | 'Other';
  startDate?: Date;
  mustChangePassword?: boolean;
  status?: 'active' | 'invited' | 'disabled';
  invitedAt?: Date;
  inviteTokenHash?: string;
  inviteExpiresAt?: Date;
  managerId?: Types.ObjectId;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
  notifyByEmail?: boolean;
  notifyBySms?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordExpired?: boolean;
  bootstrapAccount?: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  active: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  tokenVersion: number;
  skills?: string[];
  shift?: 'day' | 'swing' | 'night';
  weeklyCapacityHours?: number;
  comparePassword(candidate: string): Promise<boolean>;
}

// ✅ Schema definition
const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: ROLES,
      default: ['tech'],
    } as SchemaDefinitionProperty<UserRole[], UserDocument>,
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    } as SchemaDefinitionProperty<Types.ObjectId, UserDocument>,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', index: true },
    employeeId: { type: String, required: true, unique: true },
    employeeNumber: { type: String, unique: true, sparse: true, trim: true },
    trade: {
      type: String,
      enum: ['Electrical', 'Mechanical', 'Tooling', 'Facilities', 'Automation', 'Other'],
      default: 'Other',
    },
    startDate: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'invited', 'disabled'],
      default: 'active',
      index: true,
    },
    invitedAt: { type: Date },
    inviteTokenHash: { type: String, select: false },
    inviteExpiresAt: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },

    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    passwordExpired: { type: Boolean, default: false },
    bootstrapAccount: { type: Boolean, default: false },

    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },

    colorScheme: {
      type: String,
      default: 'default',
    },

    notifyByEmail: { type: Boolean, default: true },
    notifyBySms: { type: Boolean, default: false },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    active: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    shift: {
      type: String,
      enum: ['day', 'swing', 'night'],
      default: 'day',
    },
    weeklyCapacityHours: { type: Number, default: 40 },
  },
  { timestamps: true }
);

userSchema.pre<UserDocument>('validate', function syncEmployeeIdentifiers() {
  if (!this.employeeNumber && this.employeeId) {
    this.employeeNumber = this.employeeId;
  }
  if (!this.employeeId && this.employeeNumber) {
    this.employeeId = this.employeeNumber;
  }
  if (typeof this.isActive !== 'boolean') {
    this.isActive = this.active;
  }
  if (typeof this.active !== 'boolean') {
    this.active = this.isActive ?? true;
  }
  if (this.isModified('active')) {
    this.isActive = this.active;
  }
  if (this.isModified('isActive')) {
    this.active = this.isActive ?? this.active;
  }
});

// ✅ Password hashing
userSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function comparePassword(this: UserDocument, candidate: string) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidate, this.passwordHash);
};

// ✅ Export model
const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);
export default User;
