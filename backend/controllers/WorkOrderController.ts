/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';

import WorkOrder, { WorkOrderDocument } from '../models/WorkOrder';
import Permit, { type PermitDocument } from '../models/Permit';
import { emitWorkOrderUpdate } from '../server';
import notifyUser from '../utils/notify';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';

import type { WorkOrderType, WorkOrderInput } from '../types/workOrder';

import { sendResponse } from '../utils/sendResponse';
import { validateItems } from '../utils/validateItems';
import {
  workOrderCreateSchema,
  workOrderUpdateSchema,
  assignWorkOrderSchema,
  startWorkOrderSchema,
  completeWorkOrderSchema,
  cancelWorkOrderSchema,
  type WorkOrderComplete,
  type WorkOrderUpdate,
} from '../src/schemas/workOrder';
import {
  mapAssignees,
  mapPartsUsed,
  mapChecklists,
  mapSignatures,
  type RawPart,
  type RawChecklist,
  type RawSignature,
} from '../src/utils/workOrder';




const workOrderCreateFields = [
  'title',
  'asset',
  'description',
  'priority',
  'status',
  'type',
  'approvalStatus',
  'approvalRequestedBy',
  'approvedBy',
  'assignedTo',
  'assignees',
  'checklists',
  'partsUsed',
  'signatures',
  'timeSpentMin',
  'photos',
  'failureCode',
  'pmTask',
  'department',

  'line',
  'station',
  'teamMemberName',
  'importance',
  'complianceProcedureId',
  'calibrationIntervalDays',
  'dueDate',
  'completedAt',
  'permits',
  'requiredPermitTypes',
];

const workOrderUpdateFields = [...workOrderCreateFields];


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
  >
> & {
  assetId?: Types.ObjectId;
  partsUsed?: { partId: Types.ObjectId; qty: number; cost: number }[];
  checklists?: { text: string; done: boolean }[];
  signatures?: { by: Types.ObjectId; ts: Date }[];
  pmTask?: Types.ObjectId;
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  station?: Types.ObjectId;
  permits?: Types.ObjectId[];
  requiredPermitTypes?: string[];
};

interface CompleteWorkOrderBody extends WorkOrderComplete {
  photos?: string[];
  failureCode?: string;
}

const START_APPROVED_STATUSES = new Set(['approved', 'active']);
const COMPLETION_ALLOWED_STATUSES = new Set(['active', 'approved', 'closed']);

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

async function ensurePermitReadiness(
  tenantId: string,
  permitIds: (Types.ObjectId | string)[] | undefined,
  requiredTypes: string[] | undefined,
  stage: 'start' | 'complete',
): Promise<{ ok: boolean; message?: string; permits: PermitDocument[] }> {
  const ids = permitIds?.filter(Boolean) ?? [];
  const normalizedIds = ids.map((id) => toObjectId(id));
  const permits = normalizedIds.length
    ? await Permit.find({ tenantId, _id: { $in: normalizedIds } })
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
export const getAllWorkOrders: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const items = await WorkOrder.find({
      tenantId,
      ...(typeFilter ? { type: typeFilter } : {}),
    });
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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
export const searchWorkOrders: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { status, priority } = req.query;
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const start = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const end = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
    if (start && isNaN(start.getTime())) {
      sendResponse(res, null, 'Invalid startDate', 400);
      return;
    }
    if (end && isNaN(end.getTime())) {
      sendResponse(res, null, 'Invalid endDate', 400);
      return;
    }
    const query: any = { tenantId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (typeFilter) query.type = typeFilter;
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = start;
      if (end) query.createdAt.$lte = end;
    }

    const items = await WorkOrder.find(query);
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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
export const getWorkOrderById: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const item = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!item) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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

export const createWorkOrder: AuthedRequestHandler<
  ParamsDictionary,
  WorkOrderType,
  WorkOrderInput
> = async (
  req: AuthedRequest<ParamsDictionary, WorkOrderType, WorkOrderInput>,
  res: Response,
  next: NextFunction,
) => {

  try {

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
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
      ...rest
    } = parsed.data;
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
      permitDocs = await Permit.find({
        _id: { $in: validPermits.map((id) => new Types.ObjectId(id)) },
        tenantId,
      });
      if (permitDocs.length !== validPermits.length) {
        sendResponse(res, null, 'One or more permits were not found', 404);
        return;
      }
    }
    const newItem = new WorkOrder({
      ...rest,
      ...(validAssignees && { assignees: mapAssignees(validAssignees) }),
      ...(validChecklists && { checklists: mapChecklists(validChecklists as RawChecklist[]) }),
      ...(validParts && { partsUsed: mapPartsUsed(validParts as RawPart[]) }),
      ...(validSignatures && { signatures: mapSignatures(validSignatures as RawSignature[]) }),
      ...(validPermits && { permits: validPermits.map((id) => new Types.ObjectId(id)) }),
      requiredPermitTypes: normalizedRequiredPermitTypes,
      tenantId,
    });
    const saved = await newItem.save();
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userObjectId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    if (permitDocs.length) {
      await Promise.all(
        permitDocs.map(async (doc) => {
          if (!doc.workOrder || !doc.workOrder.equals(saved._id)) {
            doc.workOrder = saved._id;
          }
          doc.history.push({
            action: 'linked-work-order',
            by: userObjectId,
            at: new Date(),
            notes: `Linked to work order ${saved.title}`,
          });
          await doc.save();
        }),
      );
    }
    const userId = userObjectId;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'WorkOrder',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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
export const updateWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parsed = workOrderUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const incomingPermits = parsed.data?.permits;
    const incomingRequiredPermitTypes = parsed.data?.requiredPermitTypes;
    const update: UpdateWorkOrderBody = parsed.data as UpdateWorkOrderBody;
    let permitDocs: PermitDocument[] | undefined;
    if (update.partsUsed) {
      const validParts = validateItems<RawPart>(
        res,
        update.partsUsed,
        p => Types.ObjectId.isValid(p.partId),
        'part'
      );
      if (!validParts) return;
      update.partsUsed = mapPartsUsed(validParts as RawPart[]);
    }
    if (update.assignees) {
      const validAssignees = validateItems<string>(
        res,
        update.assignees,
        id => Types.ObjectId.isValid(id),
        'assignee'
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
      update.checklists = mapChecklists(validChecklists as RawChecklist[]);
    }
    if (update.signatures) {
      const validSignatures = validateItems<RawSignature>(
        res,
        update.signatures,
        s => Types.ObjectId.isValid(s.userId),
        'signature'
      );
      if (!validSignatures) return;
      update.signatures = mapSignatures(validSignatures as RawSignature[]);
    }
    if (incomingPermits) {
      const validPermits = validateItems<string>(
        res,
        incomingPermits,
        id => Types.ObjectId.isValid(id),
        'permit'
      );
      if (!validPermits) return;
      permitDocs = await Permit.find({
        _id: { $in: validPermits.map((id) => new Types.ObjectId(id)) },
        tenantId,
      });
      if (permitDocs.length !== validPermits.length) {
        sendResponse(res, null, 'One or more permits were not found', 404);
        return;
      }
      update.permits = permitDocs.map((doc) => doc._id);
    }
    if (incomingRequiredPermitTypes) {
      update.requiredPermitTypes = Array.from(new Set(incomingRequiredPermitTypes));
    }
    const existing = await WorkOrder.findOne({ _id: req.params.id, tenantId }) as WorkOrderDocument | null;
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      update,
      { new: true, runValidators: true }
    ) as WorkOrderDocument | null;
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userObjectId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    if (permitDocs) {
      const newIds = new Set(permitDocs.map((doc) => doc._id.toString()));
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
            by: userObjectId,
            at: new Date(),
            notes: `Linked to work order ${updated.title}`,
          });
          await doc.save();
        }),
      );
    }
    await writeAuditLog({
      tenantId,
      userId: userObjectId,
      action: 'update',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: existing.toObject(),
      after: updated.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(updated));
    sendResponse(res, updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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
export const deleteWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const deleted = await WorkOrder.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: deleted.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload({ _id: req.params.id, deleted: true }));
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

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
 
export const approveWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userIdStr = req.user?._id ?? req.user?.id;
    if (!userIdStr) {
      sendResponse(res, null, 'Not authenticated', 401);
      return;
    }
    const userObjectId = new Types.ObjectId(userIdStr);
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }

    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
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

    if (status === 'pending') {
      if (userObjectId) workOrder.approvalRequestedBy = userObjectId;
    } else if (userObjectId) {
      workOrder.approvedBy = userObjectId;
    }

    const saved = await workOrder.save();
    await writeAuditLog({
      tenantId,
      userId: userObjectId,
      action: 'approve',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: saved.toObject(),
    });
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
};
 
export const assignWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
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
      sendResponse(res, null, readiness.message ?? 'Permits not satisfied for completion', 409);
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
    const parsed = assignWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'assigned';
    if (parsed.data.assignees) {
      const validAssignees = validateItems(res, parsed.data.assignees, id => Types.ObjectId.isValid(id), 'assignee');
      if (!validAssignees) return;
      workOrder.assignees = mapAssignees(validAssignees) || [];
    }
    const saved = await workOrder.save();
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'assign',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: saved.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const startWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
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
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
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
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userObjectId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    if (readiness.permits.length) {
      await Promise.all(
        readiness.permits.map(async (permit) => {
          if (permit.status === 'approved') {
            permit.status = 'active';
          }
          permit.history.push({
            action: 'work-order-started',
            by: userObjectId,
            at: new Date(),
            notes: `Work order ${workOrder.title} started`,
          });
          await permit.save();
        }),
      );
    }
    await writeAuditLog({
      tenantId,
      userId: userObjectId,
      action: 'start',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: saved.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const completeWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
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
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
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
    const body = req.body as CompleteWorkOrderBody;
    const before = workOrder.toObject();
    workOrder.status = 'completed';
    if (body.timeSpentMin !== undefined) workOrder.timeSpentMin = body.timeSpentMin;
    if (Array.isArray(body.partsUsed)) {
      const validParts = validateItems(res, body.partsUsed, p => Types.ObjectId.isValid(p.partId), 'part');
      if (!validParts) return;
      workOrder.partsUsed = mapPartsUsed(validParts) || [];
    }
    if (Array.isArray(body.checklists)) {
      const validChecklists = validateItems(res, body.checklists, c => typeof c.description === 'string', 'checklist');
      if (!validChecklists) return;
      workOrder.checklists = mapChecklists(validChecklists) || [];
    }
    if (Array.isArray(body.signatures)) {
      const validSignatures = validateItems(res, body.signatures, s => Types.ObjectId.isValid(s.userId), 'signature');
      if (!validSignatures) return;
      workOrder.signatures = mapSignatures(validSignatures) || [];
    }

    if (Array.isArray(body.photos)) workOrder.photos = body.photos;
    if (body.failureCode !== undefined) workOrder.failureCode = body.failureCode;

    const saved = await workOrder.save();
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userObjectId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    if (readiness.permits.length) {
      await Promise.all(
        readiness.permits.map(async (permit) => {
          if (!permit.status || permit.status !== 'closed') {
            permit.status = 'closed';
          }
          permit.history.push({
            action: 'work-order-completed',
            by: userObjectId,
            at: new Date(),
            notes: `Work order ${workOrder.title} completed`,
          });
          await permit.save();
        }),
      );
    }
    await writeAuditLog({
      tenantId,
      userId: userObjectId,
      action: 'complete',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: saved.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const cancelWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
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
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
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
    workOrder.status = 'cancelled';
    const saved = await workOrder.save();
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'cancel',
      entityType: 'WorkOrder',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: saved.toObject(),
    });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    sendResponse(res, saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};


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

export const assistWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      tenantId,
    });
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
};
