/*
 * SPDX-License-Identifier: MIT
 */

import type { ParsedQs } from 'qs';
import { Types } from 'mongoose';
import path from 'path';
import type { Express, Response } from 'express';

import WorkOrder, { type WorkOrderDocument, type WorkOrder as WorkOrderModel } from '../models/WorkOrder';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { technicianStateSchema, technicianPartUsageSchema } from '../src/schemas/technician';
import { emitWorkOrderUpdate } from '../server';
import type { WorkOrderUpdatePayload } from '../types/Payloads';
import type { UploadedFile } from '../../shared/types/uploads';
import { sendResponse, writeAuditLog, normalizePartUsageCosts } from '../utils';

const resolvePlantId = (
  req: Pick<AuthedRequest, 'plantId' | 'siteId'>,
): string | undefined => req.plantId ?? req.siteId ?? undefined;

const withPlantScope = <T extends Record<string, unknown>>(filter: T, plantId?: string | undefined): T => {
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
  req: Pick<AuthedRequest, 'user'>,
): Types.ObjectId | undefined => {
  const raw: unknown = req.user?._id ?? req.user?.id;
  if (!raw) return undefined;
  if (typeof raw === 'string' || (typeof raw === 'object' && raw instanceof Types.ObjectId)) {
    return toObjectId(raw);
  }
  return undefined;
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

type TechnicianWorkOrderMatch = {
  tenantId: string;
  $or: ({ assignedTo: Types.ObjectId; assignees?: never } | { assignees: Types.ObjectId; assignedTo?: never })[];
  status?: { $in: string[] };
  plant?: string;
};

type WorkOrderPartUsageEntry = {
  partId?: Types.ObjectId | string | null;
  qty?: number | null;
  cost?: number | null;
};

type WorkOrderLean = Partial<
  Omit<WorkOrderModel, 'assetId' | 'partsUsed' | 'photos' | 'department'>
> & {
  _id?: Types.ObjectId;
  assetId?: { _id?: Types.ObjectId; name?: string } | Types.ObjectId | string | null;
  department?: Types.ObjectId | string | null;
  partsUsed?: WorkOrderPartUsageEntry[];
  photos?: string[];
};

const toWorkOrderUpdatePayload = (doc: WorkOrderDocument): WorkOrderUpdatePayload => {
  const tenantId =
    doc.tenantId instanceof Types.ObjectId ? doc.tenantId.toString() : String(doc.tenantId);

  const complianceProcedureId =
    doc.complianceProcedureId && (doc.complianceProcedureId as any) instanceof Types.ObjectId
      ? (doc.complianceProcedureId as unknown as Types.ObjectId).toString()
      : doc.complianceProcedureId
      ? String(doc.complianceProcedureId)
      : '';

  const calibrationIntervalDays =
    typeof doc.calibrationIntervalDays === 'number' ? doc.calibrationIntervalDays : 0;

  const assignees = Array.isArray(doc.assignees)
    ? doc.assignees.map((assignee) => String(assignee))
    : [];

  return {
    _id: doc._id.toString(),
    tenantId,
    title: doc.title,
    status: doc.status,
    type: doc.type,
    complianceProcedureId,
    calibrationIntervalDays,
    assignees,
  };
};

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
        .map((part: WorkOrderPartUsageEntry) => {
          if (!part?.partId) return null;
          const partId = part.partId instanceof Types.ObjectId ? part.partId.toString() : String(part.partId);
          return {
            partId,
            qty: part.qty ?? 0,
            cost: part.cost ?? 0,
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

    const baseMatch: TechnicianWorkOrderMatch = withPlantScope<TechnicianWorkOrderMatch>(
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

interface TechnicianContext {
  tenantId: string;
  userId: Types.ObjectId;
  plantId?: string | undefined;
}

const ensureTenantContext = (
  req: Pick<AuthedRequest, 'tenantId' | 'plantId' | 'siteId' | 'user'>,
): TechnicianContext | undefined => {
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

const actionStatusMap: Partial<Record<TechnicianStateAction, WorkOrderDocument['status']>> = {
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
      workOrder.status = newStatus;
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
    type PersistedPartEntry = { partId: Types.ObjectId; qty: number; cost?: number | undefined };
    const map = new Map<string, PersistedPartEntry>();

    if (Array.isArray(workOrder.partsUsed)) {
      (workOrder.partsUsed as unknown as WorkOrderPartUsageEntry[]).forEach((entry) => {
        if (!entry?.partId) return;
        const id = entry.partId instanceof Types.ObjectId ? entry.partId : toObjectId(String(entry.partId));
        const nextEntry: PersistedPartEntry = {
          partId: id,
          qty: (entry as { qty?: number }).qty ?? 0,
        };
        const cost = (entry as { cost?: number }).cost;
        if (cost !== undefined) {
          nextEntry.cost = cost;
        }
        map.set(id.toString(), nextEntry);
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

    const normalizedUsage = await normalizePartUsageCosts(tenantId, Array.from(map.values()));
    workOrder.set('partsUsed', normalizedUsage.parts);
    workOrder.partsCost = normalizedUsage.partsCost;
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
    if (!Array.isArray(workOrder.photos)) {
      workOrder.set('photos', []);
    }
    const photos = workOrder.photos as Types.Array<string>;
    files.forEach((file) => {
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), file.path);
      const normalized = relativePath.replace(/\\/g, '/');
      const url = `/static/uploads/${normalized}`;
      photos.push(url);
      uploads.push({ id: file.filename, filename: file.originalname, url });
    });

    const saved = await workOrder.save();
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, { uploads, workOrder: toTechnicianPayload(saved) });
  } catch (err) {
    next(err);
  }
};


