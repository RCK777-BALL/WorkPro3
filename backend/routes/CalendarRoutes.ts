import express, { type Request, type Response, type NextFunction } from 'express';
import WorkOrder from '../models/WorkOrder';

const router = express.Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await WorkOrder.find({ dueDate: { $exists: true } }).select(
      'title dueDate',
    );
    return res.json(
      events.map((e) => ({ id: e._id, title: e.title, date: e.dueDate })),
    );
  } catch (err) {
    return next(err);
  }
});

export default router;
