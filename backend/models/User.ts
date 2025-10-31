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
  plant?: Types.ObjectId;
  employeeId: string;
  managerId?: Types.ObjectId;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  tokenVersion: number;
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
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', index: true },
    employeeId: { type: String, required: true, unique: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },

    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },

    colorScheme: {
      type: String,
      default: 'default',
    },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ✅ Password hashing
userSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err as Error);
  }
});

userSchema.methods.comparePassword = async function comparePassword(this: UserDocument, candidate: string) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidate, this.passwordHash);
};

// ✅ Export model
const User: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);
export default User;
