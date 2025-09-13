/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Number of bcrypt salt rounds. Increasing this value strengthens password hashes
// but slows down hashing, impacting performance. Adjust here to change the
// hashing cost globally.
export const SALT_ROUNDS = 10;

export type UserRole = 'admin' | 'supervisor' | 'planner' | 'tech';

// ✅ Interface for a user document
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  tenantId: mongoose.Schema.Types.ObjectId;
  employeeId: string;
  managerId?: Types.ObjectId;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  tokenVersion: number;
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
    passwordHash: { type: String, required: true },
    roles: {
      type: [String],
      enum: ['admin', 'supervisor', 'planner', 'tech'],
      default: ['tech'],
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: String, required: true, unique: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

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

// ✅ Export model
const User: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);
export default User;
