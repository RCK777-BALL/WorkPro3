import { Router, type Request, type Response, type NextFunction } from 'express';
import IntegrationHook from '../models/IntegrationHook';
import { dispatchEvent, registerHook } from '../services/integrationHub';

const router = Router();

router.get('/hooks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hooks = await IntegrationHook.find();
    res.json(hooks);
  } catch (err) {
    next(err);
  }
});

router.post('/hooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hook = await registerHook(req.body);
    res.status(201).json(hook);
  } catch (err) {
    next(err);
  }
});

router.post('/dispatch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, payload } = req.body;
    await dispatchEvent(event, payload);
    res.status(202).json({ status: 'queued' });
  } catch (err) {
    next(err);
  }
});

export default router;
