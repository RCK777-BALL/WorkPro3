import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line' }
});

export default mongoose.model('Station', stationSchema);
