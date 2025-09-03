import mongoose, { Schema } from 'mongoose';
const webhookSchema = new Schema({
    url: { type: String, required: true },
    event: { type: String, required: true },
    secret: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
webhookSchema.index({ event: 1 });
const Webhook = mongoose.model('Webhook', webhookSchema);
export default Webhook;
