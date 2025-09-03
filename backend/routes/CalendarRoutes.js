import express from 'express';
import WorkOrder from '../models/WorkOrder';
const router = express.Router();
router.get('/', async (_req, res) => {
    const events = await WorkOrder.find({ dueDate: { $exists: true } }).select('title dueDate');
    res.json(events.map((e) => ({ id: e._id, title: e.title, date: e.dueDate })));
});
export default router;
