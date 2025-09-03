import mongoose, { Schema } from 'mongoose';
const notificationSchema = new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'critical'], required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
});
notificationSchema.index({ tenantId: 1 });
notificationSchema.index({ read: 1 });
const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
