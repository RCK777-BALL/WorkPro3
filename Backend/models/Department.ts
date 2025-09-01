import mongoose, { Schema, Document, model } from 'mongoose';

// Station interface and schema
export interface IStation extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  tenantId: mongoose.Types.ObjectId;
  assets: mongoose.Types.ObjectId[];
}

export const StationSchema = new Schema<IStation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    assets: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
  },
  { _id: true }
);

// Line interface and schema
export interface ILine extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  tenantId: mongoose.Types.ObjectId;
  stations: mongoose.Types.DocumentArray<IStation>;
}

export const LineSchema = new Schema<ILine>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    stations: [StationSchema],
  },
  { _id: true }
);

// Department interface and schema
export interface IDepartment extends Document {
  name: string;
  tenantId: mongoose.Types.ObjectId;
  lines: mongoose.Types.DocumentArray<ILine>;
}

export const DepartmentSchema = new Schema<IDepartment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  lines: [LineSchema],
});

DepartmentSchema.index({ 'lines._id': 1 });
DepartmentSchema.index({ 'lines.stations._id': 1 });

export default model<IDepartment>('Department', DepartmentSchema);

