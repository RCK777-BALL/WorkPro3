/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { z, ZodError } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import IntegrationHook from '../models/IntegrationHook';
import { registerHook, dispatchEvent } from '../services/integrationHub';
import { execute } from '../integrations/graphql';

const router = Router();

router.use(requireAuth);

router.get('/hooks', async (_req, res, next) => {
  try {
    const hooks = await IntegrationHook.find().lean().exec();
    res.json({ success: true, data: hooks });
  } catch (err) {
    next(err);
  }
});

const hookSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['webhook', 'sap', 'powerbi']),
  url: z.string().url().optional(),
  events: z.array(z.string().min(1)).min(1),
});

router.post('/hooks', async (req, res, next) => {
  try {
    const data: z.infer<typeof hookSchema> = hookSchema.parse(req.body);
    const hookPayload = {
      name: data.name,
      type: data.type,
      events: data.events,
      ...(data.url !== undefined ? { url: data.url } : {}),
    };
    const hook = await registerHook(hookPayload);
    res.status(201).json({ success: true, data: hook });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: err.flatten() });
      return;
    }
    next(err);
  }
});

const dispatchSchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
});

router.post('/dispatch', async (req, res, next) => {
  try {
    const parsed = dispatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    await dispatchEvent(parsed.data.event, parsed.data.payload);
    res.json({ success: true, message: 'Event dispatched' });
  } catch (err) {
    next(err);
  }
});

router.post('/graphql', async (req, res, next) => {
  try {
    const { query, variables } = req.body ?? {};
    if (typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ success: false, error: 'Query is required' });
      return;
    }
    const result = await execute(query, variables);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
