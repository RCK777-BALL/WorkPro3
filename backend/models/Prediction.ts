import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  metric: { type: String, required: true },
  predictedValue: { type: Number, required: true },
  lowerBound: { type: Number, required: true },
  upperBound: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
});

export default mongoose.model('Prediction', predictionSchema);
