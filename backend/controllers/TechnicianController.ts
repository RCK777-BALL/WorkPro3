/*
 * SPDX-License-Identifier: MIT
 */

import type { ParsedQs } from 'qs';
import { Types } from 'mongoose';
import path from 'path';
import type { Express, Response } from 'express';

import WorkOrder, { type WorkOrderDocument } from '../models/WorkOrder';
import type { AuthedRequestHandler } from '../types/http';
import sendResponse from '../utils/sendResponse';
import { technicianStateSchema, technicianPartUsageSchema } from '../src/schemas/technician';
import { writeAuditLog } from '../utils/audit';
import { emitWorkOrderUpdate } from '../server';
import type { WorkOrderUpdatePayload } from '../types/Payloads';
import type { UploadedFile } from '@shared/uploads';

const resolvePlantId = (req: { plantId?: string; siteId?: string }): string | undefined =>
  req.plantId ?? req.siteId ?? undefined;

const withPlantScope = <T extends Record<string, unknown>>(filter: T, plantId?: string): T => {
  if (plantId) {
    (filter as Record<string, unknown>).plant = plantId;
  }
  return filter;
};

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

const toMaybeString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  return undefined;
};

const resolveUserObjectId = (
  req: { user?: { _id?: string | Types.ObjectId; id?: string | Types.ObjectId } },
): Types.ObjectId | undefined => {
  const raw = req.user?._id ?? req.user?.id;
  return raw ? toObjectId(raw) : undefined;
};

const isAssignedToUser = (workOrder: WorkOrderDocument, userId: Types.ObjectId): boolean => {
  if (workOrder.assignedTo && workOrder.assignedTo instanceof Types.ObjectId) {
    if (workOrder.assignedTo.equals(userId)) {
      return true;
    }
  } else if (typeof workOrder.assignedTo === 'string' && workOrder.assignedTo === userId.toString()) {
    return true;
  }

  if (Array.isArray(workOrder.assignees)) {
    return workOrder.assignees.some((assignee) => {
      if (assignee instanceof Types.ObjectId) {
        return assignee.equals(userId);
      }
      return typeof assignee === 'string' && assignee === userId.toString();
    });
  }

  return false;
};

type TechnicianListQuery = ParsedQs & {
  status?: string;
  limit?: string;
};

const DEFAULT_LIST_STATUSES = ['requested', 'assigned', 'in_progress', 'paused'] as const;

type WorkOrderLean = ReturnType<WorkOrderDocument['toObject']> & {
  assetId?: { _id?: Types.ObjectId; name?: string } | Types.ObjectId | null;
};

const toWorkOrderUpdatePayload = (doc: WorkOrderDocument): WorkOrderUpdatePayload => ({
  _id: doc._id.toString(),
  tenantId: doc.tenantId instanceof Types.ObjectId ? doc.tenantId.toString() : String(doc.tenantId),
  title: doc.title,
  status: doc.status,
  type: doc.type,
  complianceProcedureId: doc.complianceProcedureId,
  calibrationIntervalDays: doc.calibrationIntervalDays,
  assignees: Array.isArray(doc.assignees)
    ? doc.assignees.map((assignee) => assignee.toString())
    : undefined,
});

const toTechnicianPayload = (
  doc: WorkOrderDocument | WorkOrderLean,
): Record<string, unknown> => {
  const plain: WorkOrderLean =
    typeof (doc as WorkOrderDocument).toObject === 'function'
      ? ((doc as WorkOrderDocument).toObject({ virtuals: false }) as WorkOrderLean)
      : (doc as WorkOrderLean);

  const assetField = plain.assetId;
  const asset =
    assetField && typeof assetField === 'object'
      ? {
          id: assetField._id ? assetField._id.toString() : undefined,
          name: (assetField as { name?: string }).name,
        }
      : undefined;

  const parts = Array.isArray(plain.partsUsed)
    ? plain.partsUsed
        .map((part) => {
          if (!part?.partId) return null;
          const partId = part.partId instanceof Types.ObjectId ? part.partId.toString() : String(part.partId);
          return {
            partId,
            qty: (part as { qty?: number }).qty ?? 0,
            cost: (part as { cost?: number }).cost ?? 0,
          };
        })
        .filter((value): value is { partId: string; qty: number; cost: number } => Boolean(value))
    : [];

  return {
    id: plain._id?.toString(),
    title: plain.title,
    description: plain.description,
    priority: plain.priority,
    status: plain.status,
    type: plain.type,
    asset,
    department: toMaybeString(plain.department),
    timeSpentMin: plain.timeSpentMin ?? 0,
    dueDate: plain.dueDate,
    updatedAt: plain.updatedAt,
    partsUsed: parts,
    photos: Array.isArray(plain.photos) ? plain.photos : [],
  };
};

const parseStatusFilter = (value?: string): string[] | undefined => {
  if (!value) return undefined;
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length ? tokens : undefined;
};

const sendForbidden = (res: Response): void => {
  sendResponse(res, null, 'You are not assigned to this work order', 403);
};

export const listTechnicianWorkOrders: AuthedRequestHandler<
  Record<string, string>,
  Record<string, unknown>[],
  unknown,
  TechnicianListQuery
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = resolveUserObjectId(req);
    if (!tenantId || !userId) {
      sendResponse(res, null, 'Tenant and user context are required', 400);
      return;
    }

    const plantId = resolvePlantId(req);
    const { status, limit } = req.query;
    const statuses = parseStatusFilter(status) ?? [...DEFAULT_LIST_STATUSES];
    const resolvedLimit = Math.min(Math.max(parseInt(String(limit ?? '25'), 10) || 25, 1), 100);

    const baseMatch = withPlantScope(
      {
        tenantId,
        $or: [{ assignedTo: userId }, { assignees: userId }],
      },
      plantId,
    );

    if (statuses.length) {
      baseMatch.status = { $in: statuses };
    }

    const workOrders = await WorkOrder.find(baseMatch)
      .populate({ path: 'assetId', select: 'name' })
      .sort({ updatedAt: -1 })
      .limit(resolvedLimit)
      .lean();

    const payload = workOrders.map((doc) => toTechnicianPayload(doc));
    sendResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

const ensureTenantContext = (
  req: Parameters<typeof listTechnicianWorkOrders>[0],
): { tenantId: string; userId: Types.ObjectId; plantId?: string } | undefined => {
  const tenantId = req.tenantId;
  const userId = resolveUserObjectId(req);
  if (!tenantId || !userId) {
    return undefined;
  }
  return { tenantId, userId, plantId: resolvePlantId(req) };
};

type TechnicianStateAction = 'start' | 'pause' | 'resume' | 'complete' | 'log_time';

const canTransition = (current: string, action: TechnicianStateAction): boolean => {
  switch (action) {
    case 'start':
      return ['requested', 'assigned', 'paused'].includes(current);
    case 'resume':
      return current === 'paused';
    case 'pause':
      return current === 'in_progress';
    case 'complete':
      return ['in_progress', 'paused'].includes(current);
    case 'log_time':
      return ['requested', 'assigned', 'in_progress', 'paused'].includes(current);
    default:
      return false;
  }
};

const actionStatusMap: Partial<Record<TechnicianStateAction, string>> = {
  start: 'in_progress',
  resume: 'in_progress',
  pause: 'paused',
  complete: 'completed',
};

export const updateTechnicianWorkOrderState: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const context = ensureTenantContext(req);
    if (!context) {
      sendResponse(res, null, 'Tenant and user context are required', 400);
      return;
    }

    const parsed = technicianStateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const { tenantId, userId, plantId } = context;
    const workOrder = await WorkOrder.findOne(
      withPlantScope({ _id: req.params.id, tenantId }, plantId),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Work order not found', 404);
      return;
    }

    if (!isAssignedToUser(workOrder, userId)) {
      sendForbidden(res);
      return;
    }

    const action = parsed.data.action;
    if (!canTransition(workOrder.status, action)) {
      sendResponse(res, null, `Cannot ${action} when status is ${workOrder.status}`, 409);
      return;
    }

    const before = workOrder.toObject();
    const newStatus = actionStatusMap[action];
    if (newStatus) {
      workOrder.status = newStatus as WorkOrder['status'];
      if (newStatus === 'completed') {
        workOrder.completedAt = new Date();
      }
    }

    if (parsed.data.minutesWorked && parsed.data.minutesWorked > 0) {
      workOrder.timeSpentMin = (workOrder.timeSpentMin ?? 0) + parsed.data.minutesWorked;
    }

    const saved = await workOrder.save();

    await writeAuditLog({
      tenantId,
      userId,
      entityType: 'WorkOrder',
      entityId: saved._id,
      action,
      before,
      after: saved.toObject(),
    });

    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, toTechnicianPayload(saved));
  } catch (err) {
    next(err);
  }
};

export const recordTechnicianPartUsage: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const context = ensureTenantContext(req);
    if (!context) {
      sendResponse(res, null, 'Tenant and user context are required', 400);
      return;
    }

    const parsed = technicianPartUsageSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const { tenantId, userId, plantId } = context;
    const workOrder = await WorkOrder.findOne(
      withPlantScope({ _id: req.params.id, tenantId }, plantId),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Work order not found', 404);
      return;
    }

    if (!isAssignedToUser(workOrder, userId)) {
      sendForbidden(res);
      return;
    }

    const before = workOrder.toObject();
    const map = new Map<string, { partId: Types.ObjectId; qty: number; cost?: number }>();

    if (Array.isArray(workOrder.partsUsed)) {
      workOrder.partsUsed.forEach((entry) => {
        if (!entry?.partId) return;
        const id = entry.partId instanceof Types.ObjectId ? entry.partId : toObjectId(String(entry.partId));
        map.set(id.toString(), {
          partId: id,
          qty: (entry as { qty?: number }).qty ?? 0,
          cost: (entry as { cost?: number }).cost,
        });
      });
    }

    parsed.data.entries.forEach((entry) => {
      const objectId = toObjectId(entry.partId);
      const key = objectId.toString();
      const existing = map.get(key) ?? { partId: objectId, qty: 0 };
      existing.qty += entry.qty;
      if (entry.cost !== undefined) {
        existing.cost = entry.cost;
      }
      map.set(key, existing);
    });

    workOrder.set('partsUsed', Array.from(map.values()));
    const saved = await workOrder.save();

    await writeAuditLog({
      tenantId,
      userId,
      entityType: 'WorkOrder',
      entityId: saved._id,
      action: 'technician-part-usage',
      before,
      after: saved.toObject(),
    });

    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, toTechnicianPayload(saved));
  } catch (err) {
    next(err);
  }
};

export const uploadTechnicianAttachments: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const context = ensureTenantContext(req);
    if (!context) {
      sendResponse(res, null, 'Tenant and user context are required', 400);
      return;
    }

    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : req.file
        ? [req.file as Express.Multer.File]
        : [];

    if (!files.length) {
      sendResponse(res, null, 'At least one file is required', 400);
      return;
    }

    const { tenantId, userId, plantId } = context;
    const workOrder = await WorkOrder.findOne(
      withPlantScope({ _id: req.params.id, tenantId }, plantId),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Work order not found', 404);
      return;
    }

    if (!isAssignedToUser(workOrder, userId)) {
      sendForbidden(res);
      return;
    }

    const uploads: UploadedFile[] = [];
    workOrder.photos ??= [];
    files.forEach((file) => {
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), file.path);
      const normalized = relativePath.replace(/\\/g, '/');
      const url = `/static/uploads/${normalized}`;
      workOrder.photos!.push(url);
      uploads.push({ id: file.filename, filename: file.originalname, url });
    });

    const saved = await workOrder.save();
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, { uploads, workOrder: toTechnicianPayload(saved) });
  } catch (err) {
    next(err);
  }
};
