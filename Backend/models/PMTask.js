import mongoose, { Schema } from 'mongoose';
const PmTaskSchema = new Schema({
    title: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    isActive: { type: Boolean, default: true },
    lastRun: { type: Date },
    nextDue: { type: Date },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'],
        required: true,
    },
    notes: String,
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    department: String,
}, { timestamps: true });
export default mongoose.model('PmTask', PmTaskSchema);
