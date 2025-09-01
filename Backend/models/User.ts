import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';

// ✅ Interface for a user document
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  tenantId: mongoose.Schema.Types.ObjectId;
  employeeId: string;
  managerId?: Types.ObjectId;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

}

// ✅ Schema definition
const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'technician', 'viewer'],
      default: 'viewer',
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
 
  },
  { timestamps: true }
);

// ✅ Password hashing
userSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ✅ Export model
const User: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);
export default User;
