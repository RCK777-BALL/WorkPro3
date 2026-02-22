/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';

import type { AuthedRequest } from '../types/http';

import WorkOrder, { WorkOrderDocument } from '../models/WorkOrder';
import User from '../models/User';
import WorkOrderChecklistLog, { type WorkOrderChecklistLogDocument } from '../models/WorkOrderChecklistLog';
import InventoryItem from '../models/InventoryItem';
import StockHistory from '../models/StockHistory';
import Permit, { type PermitDocument } from '../models/Permit';
import { getIO } from '../socket';
import { applyWorkflowToWorkOrder } from '../services/workflowEngine';
import { notifySlaBreach, notifyWorkOrderAssigned } from '../services/notificationService';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { closeOpenDowntimeEventsForWorkOrder } from '../services/downtimeEvents';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';

import type { WorkOrderType, WorkOrderInput } from '../types/workOrder';
import { notifyUser, auditAction, normalizePartUsageCosts, sendResponse, validateItems } from '../utils';
import { z } from 'zod';

import {
  workOrderCreateSchema,
  workOrderUpdateSchema,
  assignWorkOrderSchema,
  startWorkOrderSchema,
  completeWorkOrderSchema,
  cancelWorkOrderSchema,
  type WorkOrderComplete,
} from '../src/schemas/workOrder';

const checklistItemSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  type: z.enum(['checkbox', 'numeric', 'text', 'pass_fail']).optional(),
  required: z.boolean().optional(),
  evidenceRequired: z.boolean().optional(),
  completedValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  done: z.boolean().optional(),
  status: z.enum(['not_started', 'in_progress', 'done', 'blocked']).optional(),
  photos: z.array(z.string()).optional(),
  evidence: z.array(z.string()).optional(),
  completedAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
  completedBy: z.string().optional(),
});
import {
  mapAssignees,
  mapPartsUsed,
  mapChecklists,
  mapSignatures,
  type RawPart,
  type RawChecklist,
  type RawSignature,
} from '../src/utils/workOrder';

const emitWorkOrderUpdate = (payload: WorkOrderUpdatePayload): void => {
  try {
    getIO().emit('workOrderUpdate', payload);
  } catch {
    // Socket may be unavailable in test/runtime contexts.
  }
};



const deriveCompliance = (
  checklists?: ReturnType<typeof mapChecklists>,
): { complianceStatus: 'pending' | 'complete' | 'not_required'; complianceCompletedAt?: Date } => {
  const hasChecklists = Array.isArray(checklists) && checklists.length > 0;
  if (!hasChecklists) {
    return { complianceStatus: 'not_required', complianceCompletedAt: new Date() };
  }
  const allDone = checklists.every((item) => item.done);
  return {
    complianceStatus: allDone ? 'complete' : 'pending',
    ...(allDone ? { complianceCompletedAt: new Date() } : {}),
  };
};

type ChecklistHistoryEntry = Pick<WorkOrderChecklistLogDocument, 'passed'> & { recordedAt: Date };

const computeChecklistCompliance = (
  checklistHistory: ChecklistHistoryEntry[],
): { complianceStatus: 'pending' | 'complete' | 'not_required'; complianceCompletedAt?: Date } => {
  if (!Array.isArray(checklistHistory) || checklistHistory.length === 0) {
    return { complianceStatus: 'pending' };
  }

  const allPassed = checklistHistory.every((entry) => entry.passed !== false);
  if (allPassed) {
    return {
      complianceStatus: 'complete',
      complianceCompletedAt: checklistHistory[0].recordedAt,
    };
  }

  return { complianceStatus: 'pending' };
};



type UpdateWorkOrderBody = Partial<
  Omit<
    WorkOrderInput,
    | 'assetId'
    | 'partsUsed'
    | 'checklists'
    | 'signatures'
    | 'pmTask'
    | 'department'
    | 'line'
    | 'station'
    | 'permits'
    | 'requiredPermitTypes'
    | 'assignees'
  >
> & {
  assignees?: (string | Types.ObjectId)[];
  assetId?: Types.ObjectId | string;
  partsUsed?: RawPart[] | ReturnType<typeof mapPartsUsed>;
  checklists?: RawChecklist[] | ReturnType<typeof mapChecklists>;
  signatures?: RawSignature[] | ReturnType<typeof mapSignatures>;
  pmTask?: Types.ObjectId | string;
  department?: Types.ObjectId | string | undefined;
  line?: Types.ObjectId | string | undefined;
  station?: Types.ObjectId | string | undefined;
  permits?: (Types.ObjectId | string)[];
  requiredPermitTypes?: string[];
  permitRequirements?: WorkOrderDocument['permitRequirements'];
  plant?: Types.ObjectId | string;
  complianceStatus?: WorkOrderDocument['complianceStatus'];
  complianceCompletedAt?: WorkOrderDocument['complianceCompletedAt'];
};

interface CompleteWorkOrderBody extends WorkOrderComplete {
  photos?: string[];
  failureCode?: string;
}

const START_APPROVED_STATUSES = new Set(['approved', 'active']);
const COMPLETION_ALLOWED_STATUSES = new Set(['active', 'approved', 'closed']);
const APPROVAL_STATUS_VALUES = ['draft', 'pending', 'approved', 'rejected'] as const;
type ApprovalStatus = (typeof APPROVAL_STATUS_VALUES)[number];
const APPROVAL_REASON_CODES = ['operational', 'safety', 'quality', 'compliance', 'budget'] as const;
type ApprovalReasonCode = (typeof APPROVAL_REASON_CODES)[number];

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

function toOptionalObjectId(value: Types.ObjectId | string): Types.ObjectId;
function toOptionalObjectId(value?: Types.ObjectId | string): Types.ObjectId | undefined;
function toOptionalObjectId(value?: Types.ObjectId | string): Types.ObjectId | undefined {
  return value ? toObjectId(value) : undefined;
}

type RequestWithOptionalUser = Pick<AuthedRequest, 'user'>;

type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

type ChecklistEntry = {
  id?: string;
  text: string;
  type?: RawChecklist['type'];
  completedValue?: string | number | boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  required?: boolean;
  evidenceRequired?: boolean;
  evidence?: string[];
  photos?: string[];
  status?: RawChecklist['status'];
  done?: boolean;
};

const resolveUserObjectId = (
  req: RequestWithOptionalUser,
): Types.ObjectId | undefined => {
  const raw: unknown = req.user?._id ?? req.user?.id;
  if (!raw) return undefined;

  if (typeof raw === 'string') {
    return Types.ObjectId.isValid(raw) ? new Types.ObjectId(raw) : undefined;
  }

  if (typeof raw === 'object' && raw instanceof Types.ObjectId) {
    return raw;
  }

  return undefined;
};

const hasChecklistValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const isChecklistItemComplete = (item: ChecklistEntry): boolean => {
  if (item.status === 'done') return true;
  if (hasChecklistValue(item.completedValue)) return true;
  return typeof item.done === 'boolean' ? item.done : false;
};

const finalizeChecklistEntries = (entries: ChecklistEntry[], userId?: Types.ObjectId): ChecklistEntry[] => {
  const now = new Date();
  return entries.map((entry) => {
    const complete = isChecklistItemComplete(entry);
    const normalized: ChecklistEntry = {
      ...entry,
      id: entry.id ?? new Types.ObjectId().toString(),
    };

    if (complete) {
      normalized.status = 'done';
      normalized.done = true;
      normalized.completedAt = normalized.completedAt ?? now;
      if (!normalized.completedBy && userId) normalized.completedBy = userId;
    }

    return normalized;
  });
};

const buildChecklistPayload = (items: ChecklistItemInput[], userId?: Types.ObjectId): ChecklistEntry[] => {
  const rawItems: RawChecklist[] = items.map((item) => ({
    id: item.id ?? new Types.ObjectId().toString(),
    description: item.description,
    type: item.type,
    required: item.required,
    evidenceRequired: item.evidenceRequired,
    completedValue: item.completedValue ?? item.done,
    done: item.done,
    status: item.status,
    photos: item.photos,
    evidence: item.evidence,
    completedAt: item.completedAt,
    completedBy: item.completedBy,
  }));

  const normalized = mapChecklists(rawItems);
  return finalizeChecklistEntries(normalized as ChecklistEntry[], userId);
};

const normalizeExistingChecklistEntries = (
  entries: unknown[] | undefined,
  userId?: Types.ObjectId,
): ChecklistEntry[] => {
  if (!Array.isArray(entries)) return [];
  const mapped = entries.map((entry) => {
    const value = typeof (entry as any).toObject === 'function' ? (entry as any).toObject() : entry;
    return {
      ...value,
      id: (value as { id?: string }).id ?? (value as { _id?: Types.ObjectId })._id?.toString?.(),
    } as ChecklistEntry;
  });
  return finalizeChecklistEntries(mapped, userId);
};

const findChecklistBlockingItems = (entries: ChecklistEntry[]) => {
  const evidenceSatisfied = (entry: ChecklistEntry) => {
    const evidenceCount = (entry.evidence?.length ?? 0) + (entry.photos?.length ?? 0);
    return evidenceCount > 0;
  };

  const missingRequired = entries.filter((entry) => entry.required && !isChecklistItemComplete(entry));
  const missingEvidence = entries.filter(
    (entry) => entry.required && entry.evidenceRequired && !evidenceSatisfied(entry),
  );
  return { missingRequired, missingEvidence };
};

const getQueryString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

interface WorkOrderListQuery extends ParsedQs {
  type?: string;
}

interface WorkOrderSearchQuery extends WorkOrderListQuery {
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

type WorkOrderCollectionResponse = WorkOrderDocument[];

interface WorkOrderQueryFilter {
  tenantId: Types.ObjectId | string;
  plant?: Types.ObjectId | string;
  status?: string;
  priority?: string;
  type?: string;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

const buildWorkOrderListFilter = (
  tenantId: string,
  filters: { type?: string | undefined },
  scope?: LocationScope,
): WorkOrderQueryFilter => {
  const query: WorkOrderQueryFilter = { tenantId };

  if (filters.type) {
    query.type = filters.type;
  }
  return scope ? withLocationScope(query, scope) : query;
};

const buildWorkOrderSearchFilter = (
  tenantId: string,
  filters: {
    status?: string | undefined;
    priority?: string | undefined;
    type?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  },
  scope?: LocationScope,
): WorkOrderQueryFilter => {
  const query = buildWorkOrderListFilter(tenantId, { type: filters.type }, scope);

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {
      ...(filters.startDate ? { $gte: filters.startDate } : {}),
      ...(filters.endDate ? { $lte: filters.endDate } : {}),
    };
  }

  return query;
};

interface LocationScope {
  plantId?: string | undefined;
  siteId?: string | undefined;
}

const resolveLocationScope = (req: { plantId?: string | undefined; siteId?: string | undefined }): LocationScope => ({
  plantId: req.plantId ?? req.siteId ?? undefined,
  siteId: req.siteId ?? req.plantId ?? undefined,
});

const withLocationScope = <T extends object>(filter: T, scope: LocationScope): T => {
  if (scope.plantId) {
    (filter as any).plant = scope.plantId;
  }
  if (scope.siteId) {
    (filter as any).siteId = scope.siteId;
  }
  return filter;
};

type DispatchShift = 'day' | 'swing' | 'night';

const parseDispatchShift = (value: unknown): DispatchShift | undefined => {
  if (value === 'day' || value === 'swing' || value === 'night') return value;
  return undefined;
};

const parseIsoDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const hoursOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): number => {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  if (end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
};

const isRawPartArray = (
  parts: UpdateWorkOrderBody['partsUsed'],
): parts is RawPart[] =>
  Array.isArray(parts) && parts.every((part) => 'quantity' in part);

async function ensurePermitReadiness(
  tenantId: string,
  permitIds: (Types.ObjectId | string)[] | undefined,
  requiredTypes: string[] | undefined,
  stage: 'start' | 'complete',
): Promise<{ ok: boolean; message?: string; permits: PermitDocument[] }> {
  const ids = permitIds?.filter(Boolean) ?? [];
  const normalizedIds = ids.map((id) => toObjectId(id));
  const permits = normalizedIds.length
    ? ((await Permit.find({ tenantId, _id: { $in: normalizedIds } }).exec()) as PermitDocument[])
    : [];

  if (normalizedIds.length && permits.length !== normalizedIds.length) {
    return {
      ok: false,
      message: 'One or more linked permits could not be found',
      permits,
    };
  }

  const required = requiredTypes ?? [];
  for (const type of required) {
    if (!permits.some((permit) => permit.type === type)) {
      return {
        ok: false,
        message: `Permit type ${type} is required before this action`,
        permits,
      };
    }
  }

  if (stage === 'start') {
    const notReady = permits.find((permit) => !START_APPROVED_STATUSES.has(permit.status));
    if (notReady) {
      return {
        ok: false,
        message: `Permit ${notReady.permitNumber} is not approved for activation`,
        permits,
      };
    }
  } else {
    const pendingIsolation = permits.find((permit) =>
      permit.isolationSteps?.some((step) => !step.completed),
    );
    if (pendingIsolation) {
      return {
        ok: false,
        message: `Isolation steps remain open on permit ${pendingIsolation.permitNumber}`,
        permits,
      };
    }
    const blocked = permits.find((permit) => !COMPLETION_ALLOWED_STATUSES.has(permit.status));
    if (blocked) {
      return {
        ok: false,
        message: `Permit ${blocked.permitNumber} must be active before completion`,
        permits,
      };
    }
  }

  return { ok: true, permits };
}


function toWorkOrderUpdatePayload(doc: any): WorkOrderUpdatePayload {
  const plain = typeof doc.toObject === "function"
    ? doc.toObject({ getters: true, virtuals: false })
    : doc;
  return {
    ...plain,
    _id: (plain._id as Types.ObjectId | string)?.toString(),
    tenantId: (plain.tenantId as Types.ObjectId | string)?.toString(),
    plantId: (plain.plant as Types.ObjectId | string | undefined)?.toString(),
    siteId: (plain.siteId as Types.ObjectId | string | undefined)?.toString(),
  } as WorkOrderUpdatePayload;
}

/**
 * @openapi
 * /api/workorders:
 *   get:
 *     tags:
 *       - WorkOrders
 *     summary: Retrieve all work orders
 *     responses:
 *       200:
 *         description: List of work orders
 */
export async function getAllWorkOrders(
  req: AuthedRequest<ParamsDictionary, WorkOrderCollectionResponse, unknown, WorkOrderListQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const typeFilter = getQueryString(req.query.type);
    const scope = resolveLocationScope(req);
    const items = await WorkOrder.find(
      buildWorkOrderListFilter(tenantId, { type: typeFilter }, scope),
    );
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

/**
 * @openapi
 * /api/workorders/search:
 *   get:
 *     tags:
 *       - WorkOrders
 *     summary: Search work orders
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Filtered work orders
 */
export async function searchWorkOrders(
  req: AuthedRequest<ParamsDictionary, WorkOrderCollectionResponse, unknown, WorkOrderSearchQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const status = getQueryString(req.query.status);
    const priority = getQueryString(req.query.priority);
    const typeFilter = getQueryString(req.query.type);

    const startRaw = getQueryString(req.query.startDate);
    const endRaw = getQueryString(req.query.endDate);

    const start = startRaw ? new Date(startRaw) : undefined;
    const end = endRaw ? new Date(endRaw) : undefined;

    if (startRaw && (!start || Number.isNaN(start.getTime()))) {
      sendResponse(res, null, 'Invalid startDate', 400);
      return;
    }
    if (endRaw && (!end || Number.isNaN(end.getTime()))) {
      sendResponse(res, null, 'Invalid endDate', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    const items = await WorkOrder.find(
      buildWorkOrderSearchFilter(
        tenantId,
        {
          status,
          priority,
          type: typeFilter,
          startDate: start,
          endDate: end,
        },
        scope,
      ),
    );
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

/**
 * @openapi
 * /api/workorders/{id}:
 *   get:
 *     tags:
 *       - WorkOrders
 *     summary: Get work order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Work order found
 *       404:
 *         description: Work order not found
 */
export async function getWorkOrderById(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    const item = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    )
      .lean()
      .exec();
    if (!item) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const checklistHistory = await WorkOrderChecklistLog.find({
      workOrderId: req.params.id,
      tenantId,
    })
      .sort({ recordedAt: -1 })
      .lean();

    const compliance = computeChecklistCompliance(
      checklistHistory.map((entry) => ({
        ...entry,
        recordedAt: new Date(entry.recordedAt),
      })),
    );

    sendResponse(res, {
      ...item,
      checklistHistory,
      checklistCompliance: compliance,
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

/**
 * @openapi
 * /api/workorders:
 *   post:
 *     tags:
 *       - WorkOrders
 *     summary: Create a work order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Work order created
 *       400:
 *         description: Validation error
 */

export async function createWorkOrder(
  req: AuthedRequest<ParamsDictionary, WorkOrderType, WorkOrderInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {

  try {

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    const plantId = scope.plantId;
    if (!plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const parsed = workOrderCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const {
      assignees,
      checklists,
      partsUsed,
      signatures,
      permits,
      requiredPermitTypes,
      departmentId,
      lineId,
      stationId,
      department,
      line,
      station,
      ...rest
    } = parsed.data;
    const normalizedDepartment = toOptionalObjectId(department ?? departmentId);
    const normalizedLine = toOptionalObjectId(line ?? lineId);
    const normalizedStation = toOptionalObjectId(station ?? stationId);
    const normalizedRequiredPermitTypes = requiredPermitTypes
      ? Array.from(new Set(requiredPermitTypes))
      : [];
    const validParts = validateItems<RawPart>(
      res,
      partsUsed,
      p => Types.ObjectId.isValid(p.partId),
      'part'
    );
    if (partsUsed && !validParts) return;
    const validAssignees = validateItems<string>(
      res,
      assignees,
      id => Types.ObjectId.isValid(id),
      'assignee'
    );
    if (assignees && !validAssignees) return;
    const validChecklists = validateItems<RawChecklist>(
      res,
      checklists,
      c => typeof c.description === 'string',
      'checklist'
    );
    if (checklists && !validChecklists) return;
    const validSignatures = validateItems<RawSignature>(
      res,
      signatures,
      s => Types.ObjectId.isValid(s.userId),
      'signature'
    );
    if (signatures && !validSignatures) return;
    const validPermits = validateItems<string>(
      res,
      permits,
      id => Types.ObjectId.isValid(id),
      'permit'
    );
    if (permits && !validPermits) return;
    let permitDocs: PermitDocument[] = [];
    if (validPermits && validPermits.length) {
      permitDocs = (await Permit.find({
        _id: { $in: validPermits.map((id) => new Types.ObjectId(id)) },
        tenantId,
      }).exec()) as PermitDocument[];
      if (permitDocs.length !== validPermits.length) {
        sendResponse(res, null, 'One or more permits were not found', 404);
        return;
      }
    }
    const newItem = new WorkOrder({
      ...rest,
      ...(normalizedDepartment ? { department: normalizedDepartment } : {}),
      ...(normalizedLine ? { line: normalizedLine } : {}),
      ...(normalizedStation ? { station: normalizedStation } : {}),
      ...(validAssignees && { assignees: mapAssignees(validAssignees) }),
      ...(validChecklists && { checklists: mapChecklists(validChecklists) }),
      ...(validParts && { partsUsed: mapPartsUsed(validParts) }),
      ...(validSignatures && { signatures: mapSignatures(validSignatures) }),
      ...(validPermits && { permits: validPermits.map((id) => new Types.ObjectId(id)) }),
      requiredPermitTypes: normalizedRequiredPermitTypes,
      tenantId,
      plant: plantId,
      siteId: scope.siteId ?? plantId,
    });
    await applyWorkflowToWorkOrder(newItem);
    const saved = await newItem.save();
    const userObjectId = resolveUserObjectId(req);
    if (permitDocs.length) {
      await Promise.all(
        permitDocs.map(async (doc) => {
          if (!doc.workOrder || !doc.workOrder.equals(saved._id)) {
            doc.workOrder = saved._id;
          }
          doc.history.push({
            action: 'linked-work-order',
            ...(userObjectId ? { by: userObjectId } : {}),
            at: new Date(),
            notes: `Linked to work order ${saved.title}`,
          });
          await doc.save();
        }),
      );
    }
    await auditAction(req as unknown as Request, 'create', 'WorkOrder', saved._id, undefined, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

/**
 * @openapi
 * /api/workorders/{id}:
 *   put:
 *     tags:
 *       - WorkOrders
 *     summary: Update a work order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Work order updated
 *       404:
 *         description: Work order not found
 */
export async function updateWorkOrder(
  req: AuthedRequest<ParamsDictionary, WorkOrderType, UpdateWorkOrderBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    const plantId = scope.plantId;
    if (!plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const parsed = workOrderUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const {
      permits: incomingPermits,
      requiredPermitTypes: incomingRequiredPermitTypes,
      departmentId,
      lineId,
      stationId,
      department,
      line,
      station,
      ...restUpdate
    } = parsed.data;
    const update: UpdateWorkOrderBody = restUpdate as UpdateWorkOrderBody;
    const normalizedDepartment = toOptionalObjectId(department ?? departmentId);
    const normalizedLine = toOptionalObjectId(line ?? lineId);
    const normalizedStation = toOptionalObjectId(station ?? stationId);

    const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;

    if (departmentId !== undefined || department !== undefined) {
      update.department = normalizedDepartment;
    }
    if (lineId !== undefined || line !== undefined) {
      update.line = normalizedLine;
    }
    if (stationId !== undefined || station !== undefined) {
      update.station = normalizedStation;
    }
    let permitDocs: PermitDocument[] | undefined;
    if (update.partsUsed && isRawPartArray(update.partsUsed)) {
      const validParts = validateItems<RawPart>(
        res,
        update.partsUsed,
        (p) => Types.ObjectId.isValid(p.partId),
        'part',
      );
      if (!validParts) return;
      const mappedParts = mapPartsUsed(validParts);
      const normalizedUsage = await normalizePartUsageCosts(
        tenantId,
        mappedParts as Array<{ partId: Types.ObjectId; qty?: number; cost?: number }>,
      );
      update.partsUsed = normalizedUsage.parts;
      update.partsCost = normalizedUsage.partsCost;
    }
    if (update.assignees && update.assignees.length) {
      const assigneeIds = update.assignees.map((id) =>
        id instanceof Types.ObjectId ? id.toString() : id,
      );
      const validAssignees = validateItems<string>(
        res,
        assigneeIds,
        (id) => Types.ObjectId.isValid(id),
        'assignee',
      );
      if (!validAssignees) return;
      update.assignees = mapAssignees(validAssignees);
    }
    if (update.checklists) {
      const validChecklists = validateItems<RawChecklist>(
        res,
        update.checklists,
        c => typeof c.description === 'string',
        'checklist'
      );
      if (!validChecklists) return;
      update.checklists = mapChecklists(validChecklists);
      const compliance = deriveCompliance(update.checklists);
      update.complianceStatus = compliance.complianceStatus;
      update.complianceCompletedAt = compliance.complianceCompletedAt;
    }
    if (update.signatures) {
      const validSignatures = validateItems<RawSignature>(
        res,
        update.signatures,
        s => Types.ObjectId.isValid(s.userId),
        'signature'
      );
      if (!validSignatures) return;
      update.signatures = mapSignatures(validSignatures);
    }
    if (incomingPermits) {
      const validPermits = validateItems<string>(
        res,
        incomingPermits,
        id => Types.ObjectId.isValid(id),
        'permit'
      );
      if (!validPermits) return;
      permitDocs = (await Permit.find({
        _id: { $in: validPermits.map((id) => new Types.ObjectId(id)) },
        tenantId,
      }).exec()) as PermitDocument[];
      if (permitDocs.length !== validPermits.length) {
        sendResponse(res, null, 'One or more permits were not found', 404);
        return;
      }
      update.permits = permitDocs.map((doc) => doc._id as Types.ObjectId);
    }
    if (incomingRequiredPermitTypes) {
      update.requiredPermitTypes = Array.from(new Set(incomingRequiredPermitTypes));
    }
    const filter = withLocationScope({ _id: req.params.id, tenantId }, scope);
    const existing = await WorkOrder.findOne(filter) as WorkOrderDocument | null;
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    if (update.status === 'completed') {
      const userObjectId = resolveUserObjectId(req);
      const checklistEntries = normalizeExistingChecklistEntries(existing.checklist as unknown[], userObjectId);
      if (checklistEntries.length) {
        const { missingRequired, missingEvidence } = findChecklistBlockingItems(checklistEntries);
        if (missingRequired.length || missingEvidence.length) {
          sendResponse(
            res,
            null,
            'Required checklist items must be completed with evidence before closure',
            409,
          );
          return;
        }
      }
    }
    update.plant = plantId;
    if (scope.siteId) {
      update.siteId = scope.siteId;
    }
    const updated = await WorkOrder.findOneAndUpdate(
      filter,
      update,
      { returnDocument: 'after', runValidators: true }
    ) as WorkOrderDocument | null;
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const userObjectId = resolveUserObjectId(req);
    if (permitDocs) {
      const newIds = new Set(
        permitDocs.map((doc) => (doc._id as Types.ObjectId).toString()),
      );
      const previousIds = (existing.permits ?? []).map((id) => id.toString());
      const removedIds = previousIds.filter((id) => !newIds.has(id));
      if (removedIds.length) {
        await Permit.updateMany({ _id: { $in: removedIds.map(toObjectId) } }, { $unset: { workOrder: '' } });
      }
      await Promise.all(
        permitDocs.map(async (doc) => {
          doc.workOrder = updated._id;
          doc.history.push({
            action: 'linked-work-order',
            ...(userObjectId ? { by: userObjectId } : {}),
            at: new Date(),
            notes: `Linked to work order ${updated.title}`,
          });
          await doc.save();
        }),
      );
    }
    await auditAction(req as unknown as Request, 'update', 'WorkOrder', new Types.ObjectId(id), existing.toObject(), updated.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(updated));
    await notifySlaBreach(updated);
    sendResponse(res, updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function getDispatchTechnicians(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    const users = await User.find(
      withLocationScope(
        {
          tenantId,
          active: true,
          roles: { $in: ['tech', 'technician', 'team_member', 'technical_team_member', 'planner'] },
        },
        scope,
      ),
    )
      .select(['_id', 'name', 'email', 'skills', 'shift', 'weeklyCapacityHours', 'siteId'])
      .lean();

    const data = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name ?? user.email ?? 'Technician',
      skills: Array.isArray(user.skills) ? user.skills : [],
      shift: parseDispatchShift(user.shift) ?? 'day',
      weeklyCapacityHours: typeof user.weeklyCapacityHours === 'number' ? user.weeklyCapacityHours : 40,
      siteId: user.siteId ? user.siteId.toString() : undefined,
    }));

    sendResponse(res, data);
    return;
  } catch (err) {
    next(err);
  }
}

export async function validateDispatchAssignment(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const { workOrderId, technicianId } = (req.body ?? {}) as {
      workOrderId?: string;
      technicianId?: string;
    };

    if (!workOrderId || !Types.ObjectId.isValid(workOrderId) || !technicianId || !Types.ObjectId.isValid(technicianId)) {
      sendResponse(res, null, 'workOrderId and technicianId are required', 400);
      return;
    }

    const scope = resolveLocationScope(req);
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: workOrderId, tenantId }, scope),
    )
      .select(['requiredSkills'])
      .lean();
    if (!workOrder) {
      sendResponse(res, null, 'Work order not found', 404);
      return;
    }

    const technician = await User.findOne(
      withLocationScope({ _id: technicianId, tenantId, active: true }, scope),
    )
      .select(['skills', 'name', 'email'])
      .lean();
    if (!technician) {
      sendResponse(res, null, 'Technician not found', 404);
      return;
    }

    const requiredSkills = Array.isArray((workOrder as any).requiredSkills) ? (workOrder as any).requiredSkills : [];
    const technicianSkills = Array.isArray((technician as any).skills) ? (technician as any).skills : [];
    const missingSkills = requiredSkills.filter((skill: string) => !technicianSkills.includes(skill));

    sendResponse(res, {
      isQualified: missingSkills.length === 0,
      missingSkills,
      requiredSkills,
      technicianSkills,
      technicianName: (technician as any).name ?? (technician as any).email ?? 'Technician',
    });
    return;
  } catch (err) {
    next(err);
  }
}

export async function updateWorkOrderSchedule(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const { assigneeId, plannedStart, plannedEnd, plannedShift } = (req.body ?? {}) as {
      assigneeId?: string;
      plannedStart?: string;
      plannedEnd?: string;
      plannedShift?: DispatchShift;
    };

    const startDate = parseIsoDate(plannedStart);
    const endDate = parseIsoDate(plannedEnd);
    const shift = parseDispatchShift(plannedShift) ?? 'day';
    if (!startDate || !endDate || endDate <= startDate) {
      sendResponse(res, null, 'Valid plannedStart and plannedEnd are required', 400);
      return;
    }
    if (assigneeId && !Types.ObjectId.isValid(assigneeId)) {
      sendResponse(res, null, 'assigneeId is invalid', 400);
      return;
    }

    const scope = resolveLocationScope(req);
    const workOrder = (await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    )) as WorkOrderDocument | null;
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    let qualification: { isQualified: boolean; missingSkills: string[] } = { isQualified: true, missingSkills: [] };
    if (assigneeId) {
      const technician = await User.findOne(
        withLocationScope({ _id: assigneeId, tenantId, active: true }, scope),
      )
        .select(['skills'])
        .lean();
      if (!technician) {
        sendResponse(res, null, 'Assignee not found', 404);
        return;
      }
      const requiredSkills: string[] = Array.isArray((workOrder as any).requiredSkills)
        ? ((workOrder as any).requiredSkills as unknown as string[])
        : [];
      const technicianSkills = Array.isArray((technician as any).skills) ? (technician as any).skills : [];
      const missingSkills = requiredSkills.filter((skill: string) => !technicianSkills.includes(skill));
      qualification = { isQualified: missingSkills.length === 0, missingSkills };
    }

    const before = workOrder.toObject();
    workOrder.plannedStart = startDate;
    workOrder.plannedEnd = endDate;
    workOrder.plannedShift = shift;
    if (assigneeId) {
      const assigneeObjectId = new Types.ObjectId(assigneeId);
      workOrder.assignedTo = assigneeObjectId;
      workOrder.assignees = [assigneeObjectId] as any;
      if (workOrder.status === 'requested' || workOrder.status === 'draft') {
        workOrder.status = 'assigned';
      }
    }
    const saved = await workOrder.save();
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    await auditAction(
      req as unknown as Request,
      'schedule',
      'WorkOrder',
      new Types.ObjectId(id),
      before,
      saved.toObject(),
    );
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, {
      workOrder: saved,
      qualification,
    });
    return;
  } catch (err) {
    next(err);
  }
}

export async function getDispatchCapacity(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const fromDate = parseIsoDate(typeof req.query.from === 'string' ? req.query.from : undefined);
    const toDate = parseIsoDate(typeof req.query.to === 'string' ? req.query.to : undefined);
    if (!fromDate || !toDate || toDate <= fromDate) {
      sendResponse(res, null, 'Valid from and to query dates are required', 400);
      return;
    }
    const shiftFilter = parseDispatchShift(typeof req.query.shift === 'string' ? req.query.shift : undefined);
    const scope = resolveLocationScope(req);

    const users = await User.find(
      withLocationScope(
        {
          tenantId,
          active: true,
          roles: { $in: ['tech', 'technician', 'team_member', 'technical_team_member', 'planner'] },
          ...(shiftFilter ? { shift: shiftFilter } : {}),
        },
        scope,
      ),
    )
      .select(['_id', 'name', 'email', 'weeklyCapacityHours', 'shift'])
      .lean();

    const technicianIds = users.map((user: any) => user._id);
    const orders = await WorkOrder.find(
      withLocationScope(
        {
          tenantId,
          assignees: { $in: technicianIds },
          plannedStart: { $lte: toDate },
          plannedEnd: { $gte: fromDate },
        },
        scope,
      ),
    )
      .select(['assignees', 'plannedStart', 'plannedEnd', 'plannedShift'])
      .lean();

    const days = Math.max(1, (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    const rows = users.map((user: any) => {
      const technicianId = user._id.toString();
      const weeklyCapacityHours = typeof user.weeklyCapacityHours === 'number' ? user.weeklyCapacityHours : 40;
      const capacityHours = Number(((weeklyCapacityHours / 7) * days).toFixed(2));

      let assignedHours = 0;
      for (const order of orders as any[]) {
        const assignees = Array.isArray(order.assignees) ? order.assignees.map((id: any) => id.toString()) : [];
        if (!assignees.includes(technicianId)) continue;
        const plannedStart = order.plannedStart ? new Date(order.plannedStart) : undefined;
        const plannedEnd = order.plannedEnd ? new Date(order.plannedEnd) : undefined;
        if (!plannedStart || !plannedEnd) continue;
        assignedHours += hoursOverlap(plannedStart, plannedEnd, fromDate, toDate);
      }

      const utilization = capacityHours > 0 ? (assignedHours / capacityHours) * 100 : 0;
      return {
        technicianId,
        technicianName: user.name ?? user.email ?? 'Technician',
        shift: parseDispatchShift(user.shift) ?? 'day',
        capacityHours,
        assignedHours: Number(assignedHours.toFixed(2)),
        utilization: Number(utilization.toFixed(1)),
        overCapacity: assignedHours > capacityHours,
      };
    });

    sendResponse(res, rows.sort((a, b) => b.utilization - a.utilization));
    return;
  } catch (err) {
    next(err);
  }
}

export async function bulkDispatchUpdate(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { workOrderIds, action, payload } = (req.body ?? {}) as {
      workOrderIds?: string[];
      action?: 'reassign' | 'move' | 'swap';
      payload?: Record<string, unknown>;
    };
    if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      sendResponse(res, null, 'workOrderIds array is required', 400);
      return;
    }
    if (action !== 'reassign' && action !== 'move' && action !== 'swap') {
      sendResponse(res, null, 'Valid action is required', 400);
      return;
    }

    const normalizedIds = workOrderIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!normalizedIds.length) {
      sendResponse(res, null, 'No valid work order IDs provided', 400);
      return;
    }

    const scope = resolveLocationScope(req);
    const workOrders = (await WorkOrder.find(
      withLocationScope({ _id: { $in: normalizedIds }, tenantId }, scope),
    ).exec()) as WorkOrderDocument[];
    if (!workOrders.length) {
      sendResponse(res, { updatedCount: 0, updatedIds: [] });
      return;
    }

    const now = new Date();
    const auditOps: Promise<void>[] = [];
    const updatedIds: string[] = [];

    if (action === 'swap') {
      if (workOrders.length !== 2) {
        sendResponse(res, null, 'Swap requires exactly 2 work orders', 400);
        return;
      }
      const first = workOrders[0];
      const second = workOrders[1];
      const firstBefore = first.toObject();
      const secondBefore = second.toObject();
      const firstAssignee = first.assignedTo;
      const firstAssignees = [...(first.assignees ?? [])];
      const firstStart = first.plannedStart;
      const firstEnd = first.plannedEnd;

      first.assignedTo = second.assignedTo;
      first.assignees = second.assignees;
      first.plannedStart = second.plannedStart;
      first.plannedEnd = second.plannedEnd;

      second.assignedTo = firstAssignee;
      second.assignees = firstAssignees as any;
      second.plannedStart = firstStart;
      second.plannedEnd = firstEnd;

      await first.save();
      await second.save();
      updatedIds.push(first._id.toString(), second._id.toString());
      auditOps.push(
        auditAction(req as unknown as Request, 'dispatch_swap', 'WorkOrder', first._id, firstBefore, first.toObject()),
      );
      auditOps.push(
        auditAction(req as unknown as Request, 'dispatch_swap', 'WorkOrder', second._id, secondBefore, second.toObject()),
      );
      emitWorkOrderUpdate(toWorkOrderUpdatePayload(first));
      emitWorkOrderUpdate(toWorkOrderUpdatePayload(second));
    } else {
      for (const workOrder of workOrders) {
        const before = workOrder.toObject();
        if (action === 'reassign') {
          const assigneeId = typeof payload?.assigneeId === 'string' ? payload.assigneeId : '';
          if (!Types.ObjectId.isValid(assigneeId)) continue;
          const assigneeObjectId = new Types.ObjectId(assigneeId);
          workOrder.assignedTo = assigneeObjectId;
          workOrder.assignees = [assigneeObjectId] as any;
          if (workOrder.status === 'requested' || workOrder.status === 'draft') {
            workOrder.status = 'assigned';
          }
        }
        if (action === 'move') {
          const date = parseIsoDate(payload?.date);
          if (!date) continue;
          const baseStart = workOrder.plannedStart ? new Date(workOrder.plannedStart) : now;
          const baseEnd = workOrder.plannedEnd ? new Date(workOrder.plannedEnd) : new Date(baseStart.getTime() + 2 * 60 * 60 * 1000);
          const duration = Math.max(30 * 60 * 1000, baseEnd.getTime() - baseStart.getTime());
          const movedStart = new Date(date);
          movedStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          workOrder.plannedStart = movedStart;
          workOrder.plannedEnd = new Date(movedStart.getTime() + duration);
          const shift = parseDispatchShift(payload?.shift);
          if (shift) {
            workOrder.plannedShift = shift;
          }
        }
        await workOrder.save();
        updatedIds.push(workOrder._id.toString());
        auditOps.push(
          auditAction(req as unknown as Request, `dispatch_${action}`, 'WorkOrder', workOrder._id, before, workOrder.toObject()),
        );
        emitWorkOrderUpdate(toWorkOrderUpdatePayload(workOrder));
      }
    }

    await Promise.all(auditOps);
    sendResponse(res, {
      updatedCount: updatedIds.length,
      updatedIds,
    });
    return;
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdateWorkOrders(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const scope = resolveLocationScope(req);
    const { workOrderIds, updates } = (req.body ?? {}) as {
      workOrderIds?: string[];
      updates?: Record<string, unknown>;
    };

    if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      sendResponse(res, null, 'workOrderIds array is required', 400);
      return;
    }

    if (!updates || typeof updates !== 'object') {
      sendResponse(res, null, 'updates payload is required', 400);
      return;
    }

    const normalizedIds = workOrderIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!normalizedIds.length) {
      sendResponse(res, null, 'No valid work order IDs provided', 400);
      return;
    }

    const allowedFields = new Set([
      'status',
      'priority',
      'assignees',
      'department',
      'line',
      'station',
      'dueDate',
      'plannedStart',
      'plannedEnd',
      'plannedShift',
      'requiredSkills',
      'customFields',
    ]);

    const updateBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.has(key)) continue;
      if (['department', 'line', 'station'].includes(key)) {
        updateBody[key] = value ? toOptionalObjectId(value as string) : undefined;
      } else if (key === 'assignees' && Array.isArray(value)) {
        const validAssignees = value.filter((id) => Types.ObjectId.isValid(String(id)));
        updateBody.assignees = mapAssignees(validAssignees as string[]);
      } else if (key === 'requiredSkills' && Array.isArray(value)) {
        updateBody.requiredSkills = value.filter((skill) => typeof skill === 'string');
      } else if ((key === 'plannedStart' || key === 'plannedEnd') && typeof value === 'string') {
        const parsedDate = parseIsoDate(value);
        if (parsedDate) {
          updateBody[key] = parsedDate;
        }
      } else if (key === 'plannedShift') {
        const shift = parseDispatchShift(value);
        if (shift) updateBody.plannedShift = shift;
      } else if (key === 'customFields' && typeof value === 'object') {
        updateBody.customFields = value as Record<string, unknown>;
      } else {
        updateBody[key] = value;
      }
    }

    const filter = withLocationScope({ _id: { $in: normalizedIds }, tenantId }, scope);
    const matched = await WorkOrder.find(filter);
    const result = await WorkOrder.updateMany(filter, { $set: updateBody });

    await Promise.all(
      matched.map(async (workOrder) => {
        const before = workOrder.toObject();
        const after = { ...before, ...updateBody };
        await auditAction(
          req as unknown as Request,
          'bulk_update',
          'WorkOrder',
          workOrder._id,
          before,
          after,
        );
      }),
    );

    sendResponse(res, {
      matched: (result as any).matchedCount ?? (result as any).n,
      modified: (result as any).modifiedCount ?? (result as any).nModified,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/workorders/{id}:
 *   delete:
 *     tags:
 *       - WorkOrders
 *     summary: Delete a work order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion successful
 *       404:
 *         description: Work order not found
 */
export async function deleteWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const deleted = await WorkOrder.findOneAndDelete(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await auditAction(req as unknown as Request, 'delete', 'WorkOrder', new Types.ObjectId(id), deleted.toObject(), undefined);
    emitWorkOrderUpdate(toWorkOrderUpdatePayload({ _id: req.params.id, deleted: true }));
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function updateWorkOrderChecklist(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const scope = resolveLocationScope(req);
    if (!tenantId || !scope.plantId) {
      sendResponse(res, null, 'Active tenant and plant required', 400);
      return;
    }
    const { checklist } = req.body as { checklist?: unknown[] };
    const parsed = z.array(checklistItemSchema).safeParse(checklist);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const normalizedChecklist = buildChecklistPayload(parsed.data, resolveUserObjectId(req));
    const updated = await WorkOrder.findOneAndUpdate(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
      { checklist: normalizedChecklist },
      { returnDocument: 'after' },
    );
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const checklistHistory = await WorkOrderChecklistLog.find({
      workOrderId: req.params.id,
      tenantId,
    })
      .sort({ recordedAt: -1 })
      .lean();

    emitWorkOrderUpdate(toWorkOrderUpdatePayload(updated));
    sendResponse(res, {
      ...updated.toObject(),
      checklistHistory,
      checklistCompliance: computeChecklistCompliance(
        checklistHistory.map((entry) => ({
          ...entry,
          recordedAt: new Date(entry.recordedAt),
        })),
      ),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/workorders/{id}/approve:
 *   post:
 *     tags:
 *       - WorkOrders
 *     summary: Approve or reject a work order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Work order not found
 */

export async function approveWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userObjectId = resolveUserObjectId(req);
    if (!userObjectId) {
      sendResponse(res, null, 'Not authenticated', 401);
      return;
    }
    const { status, note, reasonCode, signatureName } = req.body as {
      status?: ApprovalStatus;
      note?: string;
      reasonCode?: ApprovalReasonCode;
      signatureName?: string;
    };

    if (!status || !APPROVAL_STATUS_VALUES.includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }
    if ((status === 'approved' || status === 'rejected') && !reasonCode) {
      sendResponse(res, null, 'Reason code is required', 400);
      return;
    }
    if (
      reasonCode &&
      !(APPROVAL_REASON_CODES as readonly string[]).includes(reasonCode)
    ) {
      sendResponse(res, null, 'Invalid reason code', 400);
      return;
    }
    if ((status === 'approved' || status === 'rejected') && (!signatureName || signatureName.trim().length < 3)) {
      sendResponse(res, null, 'Signer full name is required', 400);
      return;
    }

    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }

    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'start'
    );
    if (!readiness.ok) {
      sendResponse(res, null, readiness.message ?? 'Permits are not approved for work start', 409);
      return;
    }

    const before = workOrder.toObject();
    workOrder.approvalStatus = status;
    workOrder.approvalState = status;

    if (status === 'pending') {
      workOrder.status = 'pending_approval';
      if (userObjectId) workOrder.approvalRequestedBy = userObjectId;
    } else if (userObjectId) {
      workOrder.approvedBy = userObjectId;
      workOrder.status = status === 'approved' ? 'approved' : workOrder.status;
    }
    const approvalLog = workOrder.approvalLog ?? (workOrder.approvalLog = [] as any);
    const signedAt = new Date();
    const normalizedSignature = signatureName?.trim();
    const signatureHash = normalizedSignature
      ? createHash('sha256')
        .update(`${tenantId}:${workOrder._id.toString()}:${userObjectId.toString()}:${normalizedSignature}:${signedAt.toISOString()}`)
        .digest('hex')
      : undefined;

    approvalLog.push({
      approvedBy: userObjectId,
      approvedAt: signedAt,
      note,
      reasonCode,
      signatureName: normalizedSignature,
      signatureHash,
      signedAt,
    });
    const approvalStates = workOrder.approvalStates ?? (workOrder.approvalStates = [] as any);
    approvalStates.push({
      state: status,
      changedAt: signedAt,
      changedBy: userObjectId,
      note: [reasonCode ? `Reason: ${reasonCode}` : '', note].filter(Boolean).join(' | '),
    });

    const saved = await workOrder.save();
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    await auditAction(req as unknown as Request, 'approve', 'WorkOrder', new Types.ObjectId(id), before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));

    const message =
      status === 'pending'
        ? `Approval requested for work order "${workOrder.title}"`
        : `Work order "${workOrder.title}" was ${status}`;

    if (workOrder.assignedTo) {
      await notifyUser(workOrder.assignedTo, message);
    }

    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function exportWorkOrderCompliancePacket(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    ).lean();
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const permits = Array.isArray(workOrder.permits) && workOrder.permits.length
      ? await Permit.find({ tenantId, _id: { $in: workOrder.permits } }).lean()
      : [];

    const packet = {
      generatedAt: new Date().toISOString(),
      workOrder: {
        id: workOrder._id.toString(),
        title: workOrder.title,
        type: workOrder.type,
        status: workOrder.status,
        approvalStatus: workOrder.approvalStatus,
        complianceStatus: workOrder.complianceStatus,
        checklist: workOrder.checklist ?? [],
        attachments: workOrder.attachments ?? [],
        approvalLog: workOrder.approvalLog ?? [],
        permitRequirements: workOrder.permitRequirements ?? [],
      },
      permits,
    };
    const packetJson = JSON.stringify(packet, null, 2);
    const packetHash = createHash('sha256').update(packetJson).digest('hex');

    const format = typeof req.query.format === 'string' ? req.query.format : 'pdf';
    const safeTitle = workOrder.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-WorkOrder-Packet-Hash', packetHash);
      res.send(JSON.stringify({ packet, hash: packetHash }, null, 2));
      return;
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('error', (error) => next(error));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="workorder-${safeTitle || workOrder._id.toString()}-compliance-packet.pdf"`,
      );
      res.setHeader('X-WorkOrder-Packet-Hash', packetHash);
      res.send(pdf);
    });

    doc.fontSize(18).text('Work Order Compliance Packet');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Packet hash (SHA-256): ${packetHash}`);
    doc.moveDown();
    doc.fillColor('#000').fontSize(13).text(workOrder.title);
    doc.fontSize(10).text(`Type: ${workOrder.type}`);
    doc.text(`Status: ${workOrder.status}`);
    doc.text(`Approval: ${workOrder.approvalStatus ?? 'draft'}`);
    doc.text(`Compliance: ${workOrder.complianceStatus ?? 'not_required'}`);
    doc.moveDown();

    doc.fontSize(12).text('Approval Evidence', { underline: true });
    const approvalEntries = workOrder.approvalLog ?? [];
    if (!approvalEntries.length) {
      doc.fontSize(10).text('No approval log entries.');
    } else {
      approvalEntries.forEach((entry: any, index: number) => {
        doc.fontSize(10).text(
          `${index + 1}. ${entry.approvedAt ? new Date(entry.approvedAt).toLocaleString() : 'Unknown time'} | ` +
          `Reason: ${entry.reasonCode ?? 'n/a'} | Signer: ${entry.signatureName ?? 'n/a'}`,
        );
        if (entry.note) {
          doc.text(`   Note: ${entry.note}`);
        }
      });
    }
    doc.moveDown();

    doc.fontSize(12).text('Permits', { underline: true });
    if (!permits.length) {
      doc.fontSize(10).text('No linked permits.');
    } else {
      permits.forEach((permit, index) => {
        doc.fontSize(10).text(`${index + 1}. ${permit.permitNumber} | ${permit.type} | ${permit.status}`);
      });
    }
    doc.moveDown();

    doc.fontSize(12).text('Checklist & Attachments', { underline: true });
    doc.fontSize(10).text(`Checklist items: ${(workOrder.checklist ?? []).length}`);
    doc.text(`Attachments: ${(workOrder.attachments ?? []).length}`);
    doc.end();
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function assignWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const completionReadiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'complete'
    );
    if (!completionReadiness.ok) {
      sendResponse(
        res,
        null,
        completionReadiness.message ?? 'Permits not satisfied for completion',
        409,
      );
      return;
    }
    const startReadiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'start'
    );
    if (!startReadiness.ok) {
      sendResponse(
        res,
        null,
        startReadiness.message ?? 'Permits are not approved for work start',
        409,
      );
      return;
    }
    const parsed = assignWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'assigned';
    if (parsed.data.assignees) {
      const validAssignees = validateItems<string>(
        res,
        parsed.data.assignees,
        (id) => Types.ObjectId.isValid(id),
        'assignee',
      );
      if (!validAssignees) return;
      workOrder.set('assignees', mapAssignees(validAssignees));
    }
    const saved = await workOrder.save();
    const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;
    await auditAction(req as unknown as Request, 'assign', 'WorkOrder', new Types.ObjectId(id), before, saved.toObject());
    if (saved.assignees && saved.assignees.length) {
      await notifyWorkOrderAssigned(saved, saved.assignees as unknown as Types.ObjectId[]);
    }
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function startWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parsed = startWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'start'
    );
    if (!readiness.ok) {
      sendResponse(res, null, readiness.message ?? 'Permits are not approved for work start', 409);
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'in_progress';
    const saved = await workOrder.save();
    const userObjectId = resolveUserObjectId(req);
    if (readiness.permits.length) {
      await Promise.all(
        readiness.permits.map(async (permit) => {
          if (permit.status === 'approved') {
            permit.status = 'active';
          }
          permit.history.push({
            action: 'work-order-started',
            ...(userObjectId ? { by: userObjectId } : {}),
            at: new Date(),
            notes: `Work order ${workOrder.title} started`,
          });
          await permit.save();
        }),
      );
    }
    const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;
    await auditAction(req as unknown as Request, 'start', 'WorkOrder', new Types.ObjectId(id), before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function completeWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parsed = completeWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'complete'
    );
    if (!readiness.ok) {
      sendResponse(res, null, readiness.message ?? 'Permits are not approved for work start', 409);
      return;
    }
    const body = parsed.data as CompleteWorkOrderBody;
    const userObjectId = resolveUserObjectId(req);

    let checklistEntries: ChecklistEntry[] = [];
    if (Array.isArray(body.checklist)) {
      const parsedChecklist = z.array(checklistItemSchema).safeParse(body.checklist);
      if (!parsedChecklist.success) {
        sendResponse(res, null, parsedChecklist.error.flatten(), 400);
        return;
      }
      checklistEntries = buildChecklistPayload(parsedChecklist.data, userObjectId);
    } else if (Array.isArray(workOrder.checklist) && workOrder.checklist.length) {
      checklistEntries = normalizeExistingChecklistEntries(workOrder.checklist as unknown[], userObjectId);
    }

    if (checklistEntries.length) {
      workOrder.set('checklist', checklistEntries);
    }

    const { missingRequired, missingEvidence } = findChecklistBlockingItems(checklistEntries);
    if (missingRequired.length || missingEvidence.length) {
      sendResponse(
        res,
        null,
        'Required checklist items must be completed with evidence before closure',
        409,
      );
      return;
    }
    const approvalRequiredTypes = new Set(['safety', 'calibration']);
    if (approvalRequiredTypes.has(workOrder.type) && workOrder.approvalStatus !== 'approved') {
      sendResponse(
        res,
        null,
        'Approval must be completed before closing this work order type',
        409,
      );
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'completed';
    if (body.timeSpentMin !== undefined) workOrder.timeSpentMin = body.timeSpentMin;
    if (Array.isArray(body.partsUsed)) {
      const validParts = validateItems<RawPart>(
        res,
        body.partsUsed,
        (p) => Types.ObjectId.isValid(p.partId),
        'part',
      );
      if (!validParts) return;
      workOrder.set('partsUsed', mapPartsUsed(validParts));
    }
    if (Array.isArray(body.checklists)) {
      const validChecklists = validateItems<RawChecklist>(
        res,
        body.checklists,
        (c) => typeof c.description === 'string',
        'checklist',
      );
      if (!validChecklists) return;
      workOrder.set('checklists', mapChecklists(validChecklists));
    }
    if (Array.isArray(body.signatures)) {
      const validSignatures = validateItems<RawSignature>(
        res,
        body.signatures,
        (s) => Types.ObjectId.isValid(s.userId),
        'signature',
      );
      if (!validSignatures) return;
      workOrder.set('signatures', mapSignatures(validSignatures));
    }

    if (Array.isArray(body.photos)) workOrder.set('photos', body.photos);
    if (body.failureCode !== undefined) workOrder.failureCode = body.failureCode;

    if (Array.isArray(workOrder.partsUsed) && workOrder.partsUsed.length) {
      const { parts, partsCost } = await normalizePartUsageCosts(
        tenantId,
        workOrder.partsUsed as unknown as Array<{ partId: Types.ObjectId; qty?: number; cost?: number }>,
      );
      workOrder.set('partsUsed', parts);
      workOrder.partsCost = partsCost;
    } else {
      workOrder.partsCost = 0;
    }

    const saved = await workOrder.save();

    if (Array.isArray(workOrder.partsUsed) && workOrder.partsUsed.length) {
      await Promise.all(
        workOrder.partsUsed.map(async (usage) => {
          const partId = (usage as any).partId as Types.ObjectId | undefined;
          if (!partId) return;
          const part = await InventoryItem.findOne({ _id: partId, tenantId });
          if (!part) return;
          const delta = -Math.abs(Number((usage as any).qty ?? 0));
          part.quantity = Math.max(0, Number(part.quantity ?? 0) + delta);
          await part.save();
          await StockHistory.create({
            tenantId,
            siteId: req.siteId ? new Types.ObjectId(req.siteId) : undefined,
            stockItem: part._id,
            part: part.sharedPartId ?? part._id,
            delta,
            reason: `Consumed on WO ${workOrder.title}`,
            userId: resolveUserObjectId(req),
            balance: part.quantity,
          });
        }),
      );
    }
    if (readiness.permits.length) {
      await Promise.all(
        readiness.permits.map(async (permit) => {
          if (!permit.status || permit.status !== 'closed') {
            permit.status = 'closed';
          }
          permit.history.push({
            action: 'work-order-completed',
            ...(userObjectId ? { by: userObjectId } : {}),
            at: new Date(),
            notes: `Work order ${workOrder.title} completed`,
          });
          await permit.save();
        }),
      );
    }
    await closeOpenDowntimeEventsForWorkOrder(
      tenantId,
      workOrder._id,
      saved.completedAt ?? new Date(),
    );
    const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;
    await auditAction(req as unknown as Request, 'complete', 'WorkOrder', new Types.ObjectId(id), before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function cancelWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parsed = cancelWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope({ _id: req.params.id, tenantId }, scope),
    );
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readiness = await ensurePermitReadiness(
      tenantId,
      workOrder.permits,
      workOrder.requiredPermitTypes,
      'complete'
    );
    if (!readiness.ok) {
      sendResponse(res, null, readiness.message ?? 'Permits are not approved for work start', 409);
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'cancelled';
    const saved = await workOrder.save();
    const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;
    await auditAction(req as unknown as Request, 'cancel', 'WorkOrder', new Types.ObjectId(id), before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
}


/**
 * @openapi
 * /api/workorders/{id}/assist:
 *   get:
 *     tags:
 *       - WorkOrders
 *     summary: Get AI assistance for a work order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assistance data
 *       404:
 *         description: Work order not found
*/

export async function assistWorkOrder(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const scope = resolveLocationScope(req);
    if (!scope.plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne(
      withLocationScope(
        {
          _id: req.params.id,
          tenantId,
        },
        scope,
      ),
    )
      .lean()
      .exec();
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const result: AIAssistResult = await getWorkOrderAssistance({
      title: workOrder.title,
      description: workOrder.description || '',
    });
    sendResponse(res, result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}


// Duplicate withLocationScope removed — use the generic implementation defined earlier in this file.
