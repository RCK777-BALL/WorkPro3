import { Schema, model, Types, Document } from 'mongoose';

export interface StationSubdoc {
  _id: Types.ObjectId;
  name: string;
}

export interface LineSubdoc {
  _id: Types.ObjectId;
  name: string;
  stations: Types.DocumentArray<StationSubdoc>;
  tenantId?: Types.ObjectId;
}

export interface DepartmentDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  tenantId: Types.ObjectId;
  lines: Types.DocumentArray<LineSubdoc>;
}

const StationSchema = new Schema<StationSubdoc>({
  name: { type: String, required: true },
});

const LineSchema = new Schema<LineSubdoc>({
  name: { type: String, required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
  stations: { type: [StationSchema], default: [] },
});

const DepartmentSchema = new Schema<DepartmentDoc>(
  {
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    lines: { type: [LineSchema], default: [] },
  },
  { timestamps: true }
);

const Department = model<DepartmentDoc>('Department', DepartmentSchema);
export default Department;

