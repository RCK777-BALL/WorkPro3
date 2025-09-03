import mongoose, { Schema } from 'mongoose';
const auditEventSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
}, { timestamps: true });
// Prevent any updates after initial save
auditEventSchema.pre('save', function (next) {
    if (!this.isNew) {
        next(new Error('AuditEvent is immutable'));
    }
    else {
        next();
    }
});
const reject = (next) => {
    next(new Error('AuditEvent is immutable'));
};
['updateOne', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'remove'].forEach((hook) => {
    auditEventSchema.pre(hook, function (next) {
        reject(next);
    });
});
const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
export default AuditEvent;
