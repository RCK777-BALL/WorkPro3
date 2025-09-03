import mongoose from 'mongoose';
const workHistorySchema = new mongoose.Schema({
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actions: String,
    materialsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
    timeSpentHours: Number,
    completedAt: Date
});
export default mongoose.model('WorkHistory', workHistorySchema);
