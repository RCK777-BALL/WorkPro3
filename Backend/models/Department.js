import { Schema, model } from 'mongoose';
export const StationSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    assets: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
}, { _id: true });
export const LineSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    stations: [StationSchema],
}, { _id: true });
export const DepartmentSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    lines: [LineSchema],
});
DepartmentSchema.index({ 'lines._id': 1 });
DepartmentSchema.index({ 'lines.stations._id': 1 });
export default model('Department', DepartmentSchema);
