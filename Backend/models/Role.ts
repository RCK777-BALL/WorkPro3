import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RoleDocument extends Document {
  name: string;
  permissions: string[];
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

const Role: Model<RoleDocument> = mongoose.model<RoleDocument>('Role', roleSchema);
export default Role;
