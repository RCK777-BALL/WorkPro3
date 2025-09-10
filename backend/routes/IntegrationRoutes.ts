import { Router, type Request, type Response, type NextFunction } from 'express';
import IntegrationHook from '../models/IntegrationHook';
import { dispatchEvent, registerHook } from '../services/integrationHub';

const router = Router();

router.get('/hooks', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hooks = await IntegrationHook.find();
    return res.json(hooks);
  } catch (err) {
    return next(err);
  }
});

router.post('/hooks', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hook = await registerHook(req.body);
    return res.status(201).json(hook);
  } catch (err) {
    return next(err);
  }
});

router.post('/dispatch', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { event, payload } = req.body;
    await dispatchEvent(event, payload);
    return res.status(202).json({ status: 'queued' });
  } catch (err) {
    return next(err);
  }
});

export default router;
