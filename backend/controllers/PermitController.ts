/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import Permit, {
  type PermitDocument,
  type PermitApprovalStep,
} from '../models/Permit';
import SafetyIncident from '../models/SafetyIncident';
import WorkOrder from '../models/WorkOrder';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import notifyUser from '../utils/notify';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import {
  permitCreateSchema,
  permitUpdateSchema,
  permitDecisionSchema,
  permitIsolationSchema,
  permitIncidentSchema,
} from '../src/schemas/permit';

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

function getActiveStep(permit: PermitDocument): PermitApprovalStep | undefined {
  return permit.approvalChain.find((step) => step.status === 'pending');
}

function initializeApprovalChain(chain: PermitApprovalStep[] = []): PermitApprovalStep[] {
  return chain
    .map((step, index) => ({
      ...step,
      sequence: index,
      status: index === 0 ? 'pending' : 'blocked',
      escalateAt:
        step.escalateAfterHours && index === 0
          ? new Date(Date.now() + step.escalateAfterHours * 60 * 60 * 1000)
          : undefined,
    }))
    .map((step) => ({
      ...step,
      escalateAt: step.escalateAt ?? null,
    }));
}

async function processEscalations(tenantId: string): Promise<void> {
  const now = new Date();
  const permits = await Permit.find({
    tenantId,
    status: { $in: ['pending', 'escalated'] },
    'approvalChain.status': 'pending',
    'approvalChain.escalateAt': { $lte: now },
  });

  await Promise.all(
    permits.map(async (permit) => {
      const active = getActiveStep(permit);
      if (!active || !active.escalateAt || active.escalateAt > now) return;
      active.status = 'escalated';
      permit.status = 'escalated';
      permit.history.push({
        action: 'escalated',
        at: new Date(),
        notes: `Escalated approval step for role ${active.role}`,
      });
      await permit.save();
      await Promise.all(
        permit.watchers.map((watcher) =>
          notifyUser(toObjectId(watcher), `Permit ${permit.permitNumber} was escalated`),
        ),
      );
    }),
  );
}

function ensureTenant(req: AuthedRequest, res: Response): string | null {
  const tenantId = req.tenantId;
  if (!tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return null;
  }
  return tenantId;
}

export const listPermits: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    await processEscalations(tenantId);
    const query: Record<string, unknown> = { tenantId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const permits = await Permit.find(query).sort({ updatedAt: -1 });
    sendResponse(res, permits);
  } catch (err) {
    next(err);
  }
};

export const getPermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, permit);
  } catch (err) {
    next(err);
  }
};

export const createPermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const body = parsed.data;
    const permitNumber =
      body.permitNumber ?? `PER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const approvalChain = initializeApprovalChain(body.approvalChain);
    const permit = await Permit.create({
      tenantId,
      permitNumber,
      type: body.type,
      description: body.description,
      status: 'pending',
      requestedBy: toObjectId(body.requestedBy),
      workOrder: body.workOrder ? toObjectId(body.workOrder) : undefined,
      approvalChain,
      isolationSteps:
        body.isolationSteps?.map((step, index) => ({
          index,
          description: step.description,
          verificationNotes: step.verificationNotes,
        })) ?? [],
      watchers: body.watchers?.map(toObjectId) ?? [],
      validFrom: body.validFrom,
      validTo: body.validTo,
      riskLevel: body.riskLevel,
      history: [
        {
          action: 'created',
          by: req.user?._id ? toObjectId(req.user._id) : undefined,
          at: new Date(),
          notes: body.description,
        },
      ],
    });

    if (permit.workOrder) {
      await WorkOrder.findByIdAndUpdate(
        permit.workOrder,
        {
          $addToSet: { permits: permit._id, requiredPermitTypes: permit.type },
        },
        { new: true },
      );
    }

    const active = getActiveStep(permit);
    if (active?.user) {
      await notifyUser(toObjectId(active.user), `Permit ${permit.permitNumber} requires your approval.`);
    }

    await writeAuditLog({
      tenantId,
      userId: req.user?._id,
      action: 'create',
      entityType: 'Permit',
      entityId: toEntityId(permit._id),
      after: permit.toObject(),
    });

    sendResponse(res, permit, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updatePermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const update = parsed.data;
    if (update.approvalChain) {
      update.approvalChain = initializeApprovalChain(update.approvalChain as PermitApprovalStep[]);
    }
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const before = permit.toObject();
    if (update.type) permit.type = update.type;
    if (update.description !== undefined) permit.description = update.description;
    if (update.validFrom !== undefined) permit.validFrom = update.validFrom;
    if (update.validTo !== undefined) permit.validTo = update.validTo;
    if (update.riskLevel !== undefined) permit.riskLevel = update.riskLevel;
    if (update.watchers) permit.watchers = update.watchers.map(toObjectId);
    if (update.approvalChain) permit.approvalChain = update.approvalChain as PermitApprovalStep[];
    if (update.isolationSteps) {
      permit.isolationSteps = update.isolationSteps.map((step, index) => ({
        index,
        description: step.description,
        completed: step.completed,
        completedAt: step.completedAt,
        completedBy: step.completedBy ? toObjectId(step.completedBy) : undefined,
        verificationNotes: step.verificationNotes,
      }));
    }
    if (update.workOrder) {
      permit.workOrder = toObjectId(update.workOrder);
      await WorkOrder.findByIdAndUpdate(
        permit.workOrder,
        {
          $addToSet: { permits: permit._id, requiredPermitTypes: permit.type },
        },
        { new: true },
      );
    }

    permit.history.push({
      action: 'updated',
      by: req.user?._id ? toObjectId(req.user._id) : undefined,
      at: new Date(),
      notes: update.description,
    });

    const saved = await permit.save();

    await writeAuditLog({
      tenantId,
      userId: req.user?._id,
      action: 'update',
      entityType: 'Permit',
      entityId: toEntityId(saved._id),
      before,
      after: saved.toObject(),
    });

    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const approvePermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const active = getActiveStep(permit);
    if (!active) {
      sendResponse(res, permit, null, 200);
      return;
    }
    const userId = req.user?._id ? toObjectId(req.user._id) : undefined;
    const userRoles = (req.user as any)?.roles ?? [];
    if (active.user) {
      if (!userId || !toObjectId(active.user).equals(userId)) {
        sendResponse(res, null, 'You are not assigned to approve this step', 403);
        return;
      }
    } else if (active.role && !userRoles.includes(active.role)) {
      sendResponse(res, null, 'Insufficient role to approve this permit', 403);
      return;
    }

    active.status = 'approved';
    active.approvedAt = new Date();
    active.actedBy = userId;
    active.notes = parsed.data.notes;

    permit.history.push({
      action: 'approved',
      by: userId,
      at: new Date(),
      notes: `Step approved for role ${active.role}`,
    });

    const remaining = permit.approvalChain.find((step) => step.status === 'blocked');
    if (remaining) {
      remaining.status = 'pending';
      if (remaining.escalateAfterHours) {
        remaining.escalateAt = new Date(
          Date.now() + remaining.escalateAfterHours * 60 * 60 * 1000,
        );
      }
      if (remaining.user) {
        await notifyUser(
          toObjectId(remaining.user),
          `Permit ${permit.permitNumber} is awaiting your approval`,
        );
      }
      permit.status = 'pending';
    } else {
      permit.status = 'approved';
    }

    const saved = await permit.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'approve',
      entityType: 'Permit',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const rejectPermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const active = getActiveStep(permit);
    if (!active) {
      sendResponse(res, null, 'Permit already decided', 400);
      return;
    }
    active.status = 'rejected';
    active.actedBy = req.user?._id ? toObjectId(req.user._id) : undefined;
    active.notes = parsed.data.notes;
    permit.status = 'rejected';
    permit.history.push({
      action: 'rejected',
      by: active.actedBy,
      at: new Date(),
      notes: parsed.data.notes,
    });
    const saved = await permit.save();
    await writeAuditLog({
      tenantId,
      userId: active.actedBy,
      action: 'reject',
      entityType: 'Permit',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const escalatePermit: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const active = getActiveStep(permit);
    if (!active) {
      sendResponse(res, null, 'Permit has no pending approvals', 400);
      return;
    }
    active.status = 'escalated';
    active.escalateAt = null;
    permit.status = 'escalated';
    permit.history.push({
      action: 'escalated',
      by: req.user?._id ? toObjectId(req.user._id) : undefined,
      at: new Date(),
      notes: `Escalated approval for role ${active.role}`,
    });
    await Promise.all(
      permit.watchers.map((watcher) =>
        notifyUser(toObjectId(watcher), `Permit ${permit.permitNumber} has been escalated.`),
      ),
    );
    const saved = await permit.save();
    await writeAuditLog({
      tenantId,
      userId: req.user?._id,
      action: 'escalate',
      entityType: 'Permit',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const completeIsolationStep: AuthedRequestHandler<
  ParamsDictionary,
  PermitDocument,
  unknown,
  { index?: string }
> = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitIsolationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const index = Number(req.params.stepIndex ?? req.query.index);
    if (Number.isNaN(index) || index < 0 || index >= permit.isolationSteps.length) {
      sendResponse(res, null, 'Invalid isolation step index', 400);
      return;
    }
    const step = permit.isolationSteps[index];
    step.completed = true;
    step.completedAt = new Date();
    step.completedBy = req.user?._id ? toObjectId(req.user._id) : undefined;
    step.verificationNotes = parsed.data.verificationNotes;
    permit.history.push({
      action: 'isolation-step-completed',
      by: step.completedBy,
      at: new Date(),
      notes: `Step ${index + 1}: ${step.description}`,
    });
    const saved = await permit.save();
    await writeAuditLog({
      tenantId,
      userId: step.completedBy,
      action: 'isolation-step-completed',
      entityType: 'Permit',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const logPermitIncident: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitIncidentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const incident = await SafetyIncident.create({
      tenantId: toObjectId(tenantId),
      permit: permit._id,
      workOrder: permit.workOrder,
      title: parsed.data.title,
      description: parsed.data.description,
      severity: parsed.data.severity,
      status: parsed.data.status ?? 'open',
      reportedBy: req.user?._id ? toObjectId(req.user._id) : permit.requestedBy,
      actions:
        parsed.data.actions?.map((action) => ({
          description: action.description,
          assignedTo: action.assignedTo ? toObjectId(action.assignedTo) : undefined,
          dueDate: action.dueDate,
        })) ?? [],
      timeline: parsed.data.message
        ? [
            {
              at: new Date(),
              by: req.user?._id ? toObjectId(req.user._id) : undefined,
              message: parsed.data.message,
            },
          ]
        : [],
    });
    permit.incidents.push(incident._id);
    permit.history.push({
      action: 'incident-logged',
      by: req.user?._id ? toObjectId(req.user._id) : undefined,
      at: new Date(),
      notes: parsed.data.title,
    });
    await permit.save();
    sendResponse(res, incident, null, 201);
  } catch (err) {
    next(err);
  }
};

export const getPermitHistory: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, permit.history);
  } catch (err) {
    next(err);
  }
};

export const getSafetyKpis: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const activeCount = await Permit.countDocuments({
      tenantId,
      status: { $in: ['pending', 'approved', 'active'] },
    });
    const overdueApprovals = await Permit.countDocuments({
      tenantId,
      'approvalChain.status': 'pending',
      'approvalChain.escalateAt': { $lt: new Date() },
    });
    const incidentsLast30 = await SafetyIncident.countDocuments({
      tenantId,
      reportedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const approvalDurations = await Permit.aggregate([
      {
        $match: {
          tenantId: toObjectId(tenantId),
          status: { $in: ['approved', 'active', 'closed'] },
          createdAt: { $ne: null },
          updatedAt: { $ne: null },
        },
      },
      {
        $project: {
          durationMs: { $subtract: ['$updatedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$durationMs' },
        },
      },
    ]);
    const avgApprovalHours = approvalDurations[0]?.avgDuration
      ? approvalDurations[0].avgDuration / (1000 * 60 * 60)
      : 0;
    sendResponse(res, {
      activeCount,
      overdueApprovals,
      incidentsLast30,
      avgApprovalHours,
    });
  } catch (err) {
    next(err);
  }
};

export const getPermitActivity: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const userId = req.query.userId as string | undefined;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      sendResponse(res, null, 'userId is required', 400);
      return;
    }
    const userObjectId = new Types.ObjectId(userId);
    const permits = await Permit.find({
      tenantId,
      $or: [
        { requestedBy: userObjectId },
        { watchers: userObjectId },
        { 'approvalChain.user': userObjectId },
        { 'history.by': userObjectId },
      ],
    }).sort({ updatedAt: -1 });
    const pendingApprovals = permits.filter((permit) => {
      const step = getActiveStep(permit);
      if (!step) return false;
      if (step.user && toObjectId(step.user).equals(userObjectId)) return true;
      return step.role ? (req.user as any)?.roles?.includes(step.role) ?? false : false;
    }).length;
    const activePermits = permits.filter((permit) => permit.status === 'active').length;
    const recentHistory = permits
      .flatMap((permit) =>
        permit.history
          .filter((entry) => entry.by && toObjectId(entry.by).equals(userObjectId))
          .map((entry) => ({
            permitId: permit._id,
            permitNumber: permit.permitNumber,
            action: entry.action,
            at: entry.at,
            notes: entry.notes,
          })),
      )
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 10);
    sendResponse(res, {
      totalInvolved: permits.length,
      pendingApprovals,
      activePermits,
      recentHistory,
    });
  } catch (err) {
    next(err);
  }
};
