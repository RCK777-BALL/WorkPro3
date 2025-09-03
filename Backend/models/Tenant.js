import mongoose from 'mongoose';
const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sso: {
        provider: { type: String, enum: ['okta', 'azure'], required: false },
        issuer: { type: String, required: false },
        clientId: { type: String, required: false },
    },
}, { timestamps: true });
export default mongoose.model('Tenant', tenantSchema);
