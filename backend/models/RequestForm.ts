import mongoose from 'mongoose';

const requestFormSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    schema: { type: mongoose.Schema.Types.Mixed, required: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('RequestForm', requestFormSchema);
