/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import Permit from '../models/Permit';
import { sendResponse } from '../utils/sendResponse';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', async (req, res, next) => {
  try {
    const permits = await Permit.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendResponse(res, permits);
  } catch (err) {
    next(err);
  }
});

const permitSchema = z.object({
  permitNumber: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(['draft', 'pending', 'approved', 'active', 'closed', 'cancelled', 'escalated']).optional(),
  validFrom: z.union([z.string(), z.date()]).optional(),
  validTo: z.union([z.string(), z.date()]).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = permitSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const payload = parsed.data;
    const permit = await Permit.create({
      ...payload,
      tenantId: req.tenantId,
      validFrom: payload.validFrom ? new Date(payload.validFrom) : undefined,
      validTo: payload.validTo ? new Date(payload.validTo) : undefined,
    });
    sendResponse(res, permit, null, 201);
  } catch (err) {
    next(err);
  }
});

const updateSchema = permitSchema.partial().extend({
  isolationSteps: z
    .array(
      z.object({
        description: z.string().min(1),
        completed: z.boolean().optional(),
        completedAt: z.union([z.string(), z.date()]).optional(),
      }),
    )
    .optional(),
});

router.patch('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const update = parsed.data;
    const normalized: Record<string, unknown> = { ...update };
    if (update.validFrom) normalized.validFrom = new Date(update.validFrom);
    if (update.validTo) normalized.validTo = new Date(update.validTo);
    if (update.isolationSteps) {
      normalized.isolationSteps = update.isolationSteps.map((step) => ({
        description: step.description,
        completed: step.completed ?? false,
        completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
      }));
    }
    const permit = await Permit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      normalized,
      { new: true },
    );
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, permit);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    await Permit.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
