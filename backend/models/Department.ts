import { Schema, model, Types } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    tenantId: { type: Types.ObjectId, required: true, index: true },
    siteId: { type: Types.ObjectId, required: false, index: true },
  },
  { timestamps: true }
);

export type DepartmentDoc = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export default model<DepartmentDoc>('Department', DepartmentSchema);
