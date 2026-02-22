/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import Permit from '../models/Permit';
import { sendResponse } from '../utils/sendResponse';
import { auditLogMiddleware, recordAudit } from '../middleware/auditLogMiddleware';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(auditLogMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const permits = await Permit.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendResponse(res, permits);
  } catch (err) {
    next(err);
  }
});

const approvalSchema = z.object({
  sequence: z.number().int().nonnegative(),
  role: z.string().min(1),
  user: z.string().optional(),
  status: z.enum(['blocked', 'pending', 'approved', 'rejected', 'escalated']).optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  actedBy: z.string().optional(),
  notes: z.string().optional(),
  escalateAfterHours: z.number().int().positive().optional(),
  escalateAt: z.union([z.string(), z.date(), z.null()]).optional(),
});

const isolationSchema = z.object({
  description: z.string().min(1),
  completed: z.boolean().optional(),
  completedAt: z.union([z.string(), z.date()]).optional(),
  verificationNotes: z.string().optional(),
});

const permitSchema = z.object({
  permitNumber: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  siteId: z.string().optional(),
  workOrder: z.string().optional(),
  requestedBy: z.string().optional(),
  riskLevel: z.string().optional(),
  status: z.enum(['draft', 'pending', 'approved', 'active', 'closed', 'cancelled', 'escalated']).optional(),
  validFrom: z.union([z.string(), z.date()]).optional(),
  validTo: z.union([z.string(), z.date()]).optional(),
  approvalChain: z.array(approvalSchema).optional(),
  isolationSteps: z.array(isolationSchema).optional(),
  watchers: z.array(z.string()).optional(),
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
      siteId: payload.siteId,
      workOrder: payload.workOrder,
      requestedBy: payload.requestedBy,
      riskLevel: payload.riskLevel,
      watchers: payload.watchers ?? [],
      approvalChain: (payload.approvalChain ?? []).map((step, index) => ({
        ...step,
        sequence: step.sequence ?? index,
        approvedAt: step.approvedAt ? new Date(step.approvedAt) : undefined,
        actedBy: step.actedBy,
        escalateAt: step.escalateAt ? new Date(step.escalateAt) : undefined,
      })),
      isolationSteps: (payload.isolationSteps ?? []).map((step) => ({
        description: step.description,
        completed: step.completed ?? false,
        completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
        verificationNotes: step.verificationNotes,
      })),
      validFrom: payload.validFrom ? new Date(payload.validFrom) : undefined,
      validTo: payload.validTo ? new Date(payload.validTo) : undefined,
    });

    recordAudit(req, res, {
      action: 'create',
      entityType: 'permit',
      entityId: permit._id.toString(),
      entityLabel: permit.permitNumber,
      after: permit.toObject(),
    });

    sendResponse(res, permit, null, 201);
  } catch (err) {
    next(err);
  }
});

const updateSchema = permitSchema.partial().extend({
  status: z.enum(['draft', 'pending', 'approved', 'active', 'closed', 'cancelled', 'escalated']).optional(),
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
        verificationNotes: step.verificationNotes,
      }));
    }
    if (update.approvalChain) {
      normalized.approvalChain = update.approvalChain.map((step, index) => ({
        ...step,
        sequence: step.sequence ?? index,
        approvedAt: step.approvedAt ? new Date(step.approvedAt) : undefined,
        escalateAt: step.escalateAt ? new Date(step.escalateAt) : undefined,
      }));
    }
    if (update.watchers) normalized.watchers = update.watchers;
    const existing = await Permit.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const before = existing.toObject();
    const permit = await Permit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      normalized,
      { returnDocument: 'after' },
    );
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    recordAudit(req, res, {
      action: 'update',
      entityType: 'permit',
      entityId: permit._id.toString(),
      entityLabel: permit.permitNumber,
      before,
      after: permit.toObject(),
    });
    sendResponse(res, permit);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    await Permit.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
    recordAudit(req, res, {
      action: 'delete',
      entityType: 'permit',
      entityId: id,
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approvals', validateObjectId('id'), async (req, res, next) => {
  try {
    const approval = approvalSchema.pick({ sequence: true, status: true, notes: true, actedBy: true }).extend({
      status: z.enum(['approved', 'rejected']),
    });
    const parsed = approval.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const permit = await Permit.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const chain = permit.approvalChain ?? [];
    const idx = chain.findIndex((step) => step.sequence === parsed.data.sequence);
    if (idx === -1) {
      sendResponse(res, null, 'Approval step not found', 404);
      return;
    }

    chain[idx].status = parsed.data.status;
    chain[idx].notes = parsed.data.notes;
    chain[idx].actedBy = parsed.data.actedBy as unknown as undefined;
    chain[idx].approvedAt = new Date();
    permit.approvalChain = chain;

    permit.history.push({
      action: parsed.data.status === 'approved' ? 'approval-approved' : 'approval-rejected',
      at: new Date(),
      by: req.user?._id ? new Types.ObjectId(req.user._id) : undefined,
      notes: parsed.data.notes,
    });

    await permit.save();

    recordAudit(req, res, {
      action: 'approval',
      entityType: 'permit',
      entityId: permit._id.toString(),
      entityLabel: permit.permitNumber,
      after: permit.toObject(),
    });

    sendResponse(res, permit);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/lockout', validateObjectId('id'), async (req, res, next) => {
  try {
    const parsed = z
      .object({
        index: z.number().int().nonnegative(),
        completed: z.boolean(),
        verificationNotes: z.string().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const permit = await Permit.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    if (!permit.isolationSteps?.[parsed.data.index]) {
      sendResponse(res, null, 'Isolation step missing', 404);
      return;
    }

    permit.isolationSteps[parsed.data.index].completed = parsed.data.completed;
    permit.isolationSteps[parsed.data.index].completedAt = parsed.data.completed ? new Date() : undefined;
    permit.isolationSteps[parsed.data.index].verificationNotes = parsed.data.verificationNotes;
    permit.history.push({
      action: 'lockout-step-updated',
      at: new Date(),
      by: req.user?._id ? new Types.ObjectId(req.user._id) : undefined,
      notes: parsed.data.verificationNotes,
    });
    await permit.save();

    recordAudit(req, res, {
      action: 'lockout-step',
      entityType: 'permit',
      entityId: permit._id.toString(),
      entityLabel: permit.permitNumber,
      after: permit.toObject(),
    });

    sendResponse(res, permit);
  } catch (err) {
    next(err);
  }
});

export default router;
