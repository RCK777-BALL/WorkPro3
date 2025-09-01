import mongoose from 'mongoose';

const requestFormSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    schema: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('RequestForm', requestFormSchema);
