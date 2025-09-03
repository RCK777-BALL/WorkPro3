import mongoose from 'mongoose';
const videoSchema = new mongoose.Schema({
    title: String,
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    type: { type: String, enum: ['training', 'troubleshooting', 'overview'] },
    videoUrl: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
export default mongoose.model('Video', videoSchema);
