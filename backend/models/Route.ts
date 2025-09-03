import mongoose from 'mongoose';

const stationTaskSchema = new mongoose.Schema(
  {
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    task: { type: String, required: true },
    order: { type: Number, required: true }
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stationTasks: [stationTaskSchema],
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.model('Route', routeSchema);
