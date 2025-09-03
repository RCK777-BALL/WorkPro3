import mongoose from 'mongoose';

const timeSheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  clockIn: Date,
  clockOut: Date,
  notes: String,
  totalHours: Number
});

export default mongoose.model('TimeSheet', timeSheetSchema);
