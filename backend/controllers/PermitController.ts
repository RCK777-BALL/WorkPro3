/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { z } from 'zod';

import Permit, {
  type PermitDocument,
  type PermitApprovalStep,
  type PermitIsolationStep,
  type PermitHistoryEntry,
} from '../models/Permit';
import SafetyIncident from '../models/SafetyIncident';
import WorkOrder from '../models/WorkOrder';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import notifyUser from '../utils/notify';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import {
  permitApprovalStepSchema,
  permitCreateSchema,
  permitDecisionSchema,
  permitIncidentSchema,
  permitIsolationSchema,
  permitIsolationStepSchema,
  permitUpdateSchema,
} from '../src/schemas/permit';

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

function toOptionalObjectId(value: Types.ObjectId | string): Types.ObjectId;
function toOptionalObjectId(value?: string | Types.ObjectId): Types.ObjectId | undefined;
function toOptionalObjectId(value?: string | Types.ObjectId): Types.ObjectId | undefined {
  return value ? toObjectId(value) : undefined;
}

function resolveRequestUserId(req: AuthedRequest | Request): Types.ObjectId | undefined {
  const raw = (req.user as any)?._id ?? (req.user as any)?.id;
  return raw ? toObjectId(raw as Types.ObjectId | string) : undefined;
}

function resolveAuditUserId(req: AuthedRequest | Request) {
  return toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
}

type PermitApprovalStepInput = z.infer<typeof permitApprovalStepSchema>;
type PermitIsolationStepInput = z.infer<typeof permitIsolationStepSchema>;
type PermitCreateBody = z.infer<typeof permitCreateSchema>;
type PermitUpdateBody = z.infer<typeof permitUpdateSchema>;
type PermitDecisionBody = z.infer<typeof permitDecisionSchema>;
type PermitIsolationBody = z.infer<typeof permitIsolationSchema>;
type PermitIncidentBody = z.infer<typeof permitIncidentSchema>;

function initializeApprovalChain(
  chain: PermitApprovalStepInput[] = [],
): PermitApprovalStep[] {
  return chain.map((step, index) => {
    const escalateAt =
      step.escalateAfterHours && index === 0
        ? new Date(Date.now() + step.escalateAfterHours * 60 * 60 * 1000)
        : step.escalateAfterHours !== undefined
          ? null
          : undefined;

    return {
      sequence: step.sequence ?? index,
      role: step.role,
      status: index === 0 ? 'pending' : 'blocked',
      ...(step.user ? { user: toObjectId(step.user) } : {}),
      ...(step.escalateAfterHours !== undefined
        ? { escalateAfterHours: step.escalateAfterHours }
        : {}),
      ...(escalateAt !== undefined ? { escalateAt } : {}),
      ...(step.notes !== undefined ? { notes: step.notes } : {}),
    } satisfies PermitApprovalStep;
  });
}

function mapIsolationSteps(
  steps: PermitIsolationStepInput[] = [],
): PermitIsolationStep[] {
  return steps.map((step, index) => ({
    index,
    description: step.description,
    ...(step.completed !== undefined ? { completed: step.completed } : {}),
    ...(step.completedAt ? { completedAt: step.completedAt } : {}),
    ...(step.completedBy ? { completedBy: toObjectId(step.completedBy) } : {}),
    ...(step.verificationNotes ? { verificationNotes: step.verificationNotes } : {}),
  }));
}

function pushHistory(
  permit: PermitDocument,
  entry: Pick<PermitHistoryEntry, 'action'> & {
    notes?: string;
    by?: Types.ObjectId;
    at?: Date;
  },
): void {
  const payload: PermitHistoryEntry = {
    action: entry.action,
    at: entry.at ?? new Date(),
    ...(entry.notes !== undefined ? { notes: entry.notes } : {}),
    ...(entry.by ? { by: entry.by } : {}),
  };
  permit.history.push(payload);
}

function getActiveStep(permit: PermitDocument): PermitApprovalStep | undefined {
  return permit.approvalChain.find((step) => step.status === 'pending');
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
      active.escalateAt = null;
      permit.status = 'escalated';
      pushHistory(permit, {
        action: 'escalated',
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

function ensureTenant(req: AuthedRequest | Request, res: Response): string | null {
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

export const createPermit: AuthedRequestHandler<
  ParamsDictionary,
  PermitDocument,
  PermitCreateBody
> = async (req, res, next) => {
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
    const isolationSteps = mapIsolationSteps(body.isolationSteps);
    const watchers = body.watchers?.map((id) => toObjectId(id)) ?? [];
    const requestUserId = resolveRequestUserId(req);

    const permit = await Permit.create({
      tenantId,
      permitNumber,
      type: body.type,
      description: body.description,
      status: 'pending',
      requestedBy: toObjectId(body.requestedBy),
      workOrder: toOptionalObjectId(body.workOrder),
      approvalChain,
      isolationSteps,
      watchers,
      validFrom: body.validFrom,
      validTo: body.validTo,
      riskLevel: body.riskLevel,
      history: [
        {
          action: 'created',
          at: new Date(),
          ...(requestUserId ? { by: requestUserId } : {}),
          ...(body.description ? { notes: body.description } : {}),
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
      await notifyUser(
        toObjectId(active.user),
        `Permit ${permit.permitNumber} requires your approval.`,
      );
    }

    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'create',
      entityType: 'Permit',
      entityId: permit._id,
      after: permit.toObject(),
    });

    sendResponse(res, permit, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updatePermit: AuthedRequestHandler<
  ParamsDictionary,
  PermitDocument,
  PermitUpdateBody
> = async (req, res, next) => {
  try {
    const tenantId = ensureTenant(req, res);
    if (!tenantId) return;
    const parsed = permitUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const update = parsed.data;
    const permit = await Permit.findOne({ _id: req.params.id, tenantId });
    if (!permit) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const before = permit.toObject();

    if (update.type !== undefined) permit.type = update.type;
    if (update.description !== undefined) permit.description = update.description;
    if (update.validFrom !== undefined) permit.validFrom = update.validFrom;
    if (update.validTo !== undefined) permit.validTo = update.validTo;
    if (update.riskLevel !== undefined) permit.riskLevel = update.riskLevel;
    if (update.watchers) permit.watchers = update.watchers.map((id) => toObjectId(id));
    if (update.approvalChain) {
      permit.approvalChain = initializeApprovalChain(update.approvalChain);
    }
    if (update.isolationSteps) {
      permit.isolationSteps = mapIsolationSteps(update.isolationSteps);
    }
    if (update.workOrder !== undefined) {
      permit.workOrder = toOptionalObjectId(update.workOrder);
      if (permit.workOrder) {
        await WorkOrder.findByIdAndUpdate(
          permit.workOrder,
          {
            $addToSet: { permits: permit._id, requiredPermitTypes: permit.type },
          },
          { new: true },
        );
      }
    }

    const requestUserId = resolveRequestUserId(req);
    pushHistory(permit, {
      action: 'updated',
      ...(requestUserId ? { by: requestUserId } : {}),
      ...(update.description !== undefined ? { notes: update.description } : {}),
    });

    const saved = await permit.save();

    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'update',
      entityType: 'Permit',
      entityId: saved._id,
      before,
      after: saved.toObject(),
    });

    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const approvePermit: AuthedRequestHandler<
  ParamsDictionary,
  PermitDocument,
  PermitDecisionBody
> = async (req, res, next) => {
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
    const requestUserId = resolveRequestUserId(req);
    const userRoles = ((req.user as any)?.roles ?? []) as string[];
    if (active.user) {
      if (!requestUserId || !toObjectId(active.user).equals(requestUserId)) {
        sendResponse(res, null, 'You are not assigned to approve this step', 403);
        return;
      }
    } else if (active.role && !userRoles.includes(active.role)) {
      sendResponse(res, null, 'Insufficient role to approve this permit', 403);
      return;
    }

    active.status = 'approved';
    active.approvedAt = new Date();
    if (requestUserId) active.actedBy = requestUserId;
    if (parsed.data.notes !== undefined) {
      active.notes = parsed.data.notes;
    }

    pushHistory(permit, {
      action: 'approved',
      ...(requestUserId ? { by: requestUserId } : {}),
      notes: `Step approved for role ${active.role}`,
    });

    const remaining = permit.approvalChain.find((step) => step.status === 'blocked');
    if (remaining) {
      remaining.status = 'pending';
      if (remaining.escalateAfterHours) {
        remaining.escalateAt = new Date(
          Date.now() + remaining.escalateAfterHours * 60 * 60 * 1000,
        );
      } else {
        remaining.escalateAt = null;
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
    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'approve',
      entityType: 'Permit',
      entityId: saved._id,
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const rejectPermit: AuthedRequestHandler<
  ParamsDictionary,
  PermitDocument,
  PermitDecisionBody
> = async (req, res, next) => {
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
    const requestUserId = resolveRequestUserId(req);
    active.status = 'rejected';
    if (requestUserId) {
      active.actedBy = requestUserId;
    }
    if (parsed.data.notes !== undefined) {
      active.notes = parsed.data.notes;
    }
    permit.status = 'rejected';
    pushHistory(permit, {
      action: 'rejected',
      ...(requestUserId ? { by: requestUserId } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    });
    const saved = await permit.save();
    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'reject',
      entityType: 'Permit',
      entityId: saved._id,
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
    const requestUserId = resolveRequestUserId(req);
    pushHistory(permit, {
      action: 'escalated',
      ...(requestUserId ? { by: requestUserId } : {}),
      notes: `Escalated approval for role ${active.role}`,
    });
    await Promise.all(
      permit.watchers.map((watcher) =>
        notifyUser(toObjectId(watcher), `Permit ${permit.permitNumber} has been escalated.`),
      ),
    );
    const saved = await permit.save();
    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'escalate',
      entityType: 'Permit',
      entityId: saved._id,
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
  PermitIsolationBody,
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
    const requestUserId = resolveRequestUserId(req);
    step.completed = true;
    step.completedAt = new Date();
    if (requestUserId) {
      step.completedBy = requestUserId;
    }
    if (parsed.data.verificationNotes !== undefined) {
      step.verificationNotes = parsed.data.verificationNotes;
    }
    pushHistory(permit, {
      action: 'isolation-step-completed',
      ...(requestUserId ? { by: requestUserId } : {}),
      notes: `Step ${index + 1}: ${step.description}`,
    });
    const saved = await permit.save();
    const auditUserId = resolveAuditUserId(req);
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'isolation-step-completed',
      entityType: 'Permit',
      entityId: saved._id,
      after: saved.toObject(),
    });
    sendResponse(res, saved);
  } catch (err) {
    next(err);
  }
};

export const logPermitIncident: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  PermitIncidentBody
> = async (req, res, next) => {
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
    const requestUserId = resolveRequestUserId(req);
    const reporterId: Types.ObjectId = requestUserId ?? permit.requestedBy;
    const historyUser = resolveRequestUserId(req);
    const auditUserId = resolveAuditUserId(req);
    const message = parsed.data.message;
    const incident = await SafetyIncident.create({
      tenantId: toObjectId(tenantId),
      permit: permit._id,
      workOrder: permit.workOrder,
      title: parsed.data.title,
      description: parsed.data.description,
      severity: parsed.data.severity,
      status: parsed.data.status ?? 'open',
      reportedBy: reporterId,
      actions:
        parsed.data.actions?.map((action) => ({
          description: action.description,
          assignedTo: toOptionalObjectId(action.assignedTo),
          dueDate: action.dueDate,
        })) ?? [],
      timeline:
        message !== undefined && message !== ''
          ? [
              {
                at: new Date(),
                message,
                ...(historyUser ? { by: historyUser } : {}),
              },
            ]
          : [],
    });
    permit.incidents.push(incident._id);
    pushHistory(permit, {
      action: 'incident-logged',
      ...(historyUser ? { by: historyUser } : {}),
      ...(parsed.data.title !== undefined ? { notes: parsed.data.title } : {}),
    });
    await permit.save();
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'incident-log',
      entityType: 'Permit',
      entityId: permit._id,
      after: permit.toObject(),
    });
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
      return step.role ? ((req.user as any)?.roles ?? []).includes(step.role) : false;
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
