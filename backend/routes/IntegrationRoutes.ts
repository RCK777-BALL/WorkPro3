import { Router } from 'express';
import IntegrationHook from '../models/IntegrationHook';
import { dispatchEvent, registerHook } from '../services/integrationHub';

const router = Router();

router.get('/hooks', async (_req, res) => {
  const hooks = await IntegrationHook.find();
  res.json(hooks);
});

router.post('/hooks', async (req, res) => {
  const hook = await registerHook(req.body);
  res.status(201).json(hook);
});

router.post('/dispatch', async (req, res) => {
  const { event, payload } = req.body;
  await dispatchEvent(event, payload);
  res.status(202).json({ status: 'queued' });
});

export default router;
