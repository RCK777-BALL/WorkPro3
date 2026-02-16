/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { z, ZodError } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import IntegrationHook from '../models/IntegrationHook';
import ApiKey from '../models/ApiKey';
import WebhookSubscription from '../models/WebhookSubscription';
import ExportJob from '../models/ExportJob';
import { registerHook, dispatchEvent } from '../services/integrationHub';
import { execute } from '../integrations/graphql';
import { generateApiKey } from '../utils/apiKeys';

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

router.get('/api-keys', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const keys = await ApiKey.find({ tenantId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
});

const apiKeySchema = z.object({
  name: z.string().min(1),
  rateLimitMax: z.number().int().positive().optional(),
});

router.post('/api-keys', async (req, res, next) => {
  try {
    const data = apiKeySchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const generated = generateApiKey();
    const key = await ApiKey.create({
      name: data.name,
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId,
      createdBy: (req as any).user?._id,
      rateLimitMax: data.rateLimitMax,
    });
    const keyPayload = key.toObject();
    delete (keyPayload as { keyHash?: string }).keyHash;
    res.status(201).json({
      success: true,
      data: keyPayload,
      token: generated.key,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: err.flatten() });
      return;
    }
    next(err);
  }
});

router.post('/api-keys/:id/revoke', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { revokedAt: new Date() },
      { returnDocument: 'after' },
    );
    if (!key) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }
    res.json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
});

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  active: z.boolean().optional(),
  maxAttempts: z.number().int().positive().optional(),
});

router.get('/webhooks', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const hooks = await WebhookSubscription.find({ tenantId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: hooks });
  } catch (err) {
    next(err);
  }
});

router.post('/webhooks', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = webhookSchema.parse(req.body);
    const secret = generateApiKey().key;
    const hook = await WebhookSubscription.create({
      name: data.name,
      url: data.url,
      events: data.events,
      secret,
      active: data.active ?? true,
      maxAttempts: data.maxAttempts ?? 3,
      tenantId,
    });
    res.status(201).json({ success: true, data: hook, secret });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: err.flatten() });
      return;
    }
    next(err);
  }
});

router.delete('/webhooks/:id', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const deleted = await WebhookSubscription.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Webhook not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

const exportSchema = z.object({
  type: z.string().min(1),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  filters: z.record(z.unknown()).optional(),
});

router.get('/exports', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const jobs = await ExportJob.find({ tenantId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
});

router.post('/exports', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = exportSchema.parse(req.body);
    const job = await ExportJob.create({
      tenantId,
      requestedBy: (req as any).user?._id,
      type: data.type,
      format: data.format,
      status: 'queued',
      filters: data.filters,
    });
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: err.flatten() });
      return;
    }
    next(err);
  }
});

router.get('/exports/:id/download', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const job = await ExportJob.findOne({ _id: req.params.id, tenantId }).lean();
    if (!job || !job.filePath || !job.fileName || job.status !== 'completed') {
      res.status(404).json({ success: false, message: 'Export not ready' });
      return;
    }
    res.download(job.filePath!, job.fileName!);
  } catch (err) {
    next(err);
  }
});

export default router;
