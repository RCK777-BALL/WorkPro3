/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';

import WorkOrder, { WorkOrderDocument } from '../models/WorkOrder';
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
  'dueDate',
  'completedAt',
];

const workOrderUpdateFields = [...workOrderCreateFields];

type UpdateWorkOrderBody = Partial<
  Omit<
    WorkOrderInput,
    'assetId' | 'pmTask' | 'department' | 'line' | 'station' | 'partsUsed'
  >
> & {
  assetId?: Types.ObjectId;
  pmTask?: Types.ObjectId;
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  station?: Types.ObjectId;
  partsUsed?: { partId: Types.ObjectId; qty: number; cost?: number }[];
};

interface CompleteWorkOrderBody extends WorkOrderComplete {
  photos?: string[];
  failureCode?: string;
}

interface UpdateWorkOrderBody extends WorkOrderUpdate {
  partsUsed?: RawPart[];
  checklists?: RawChecklist[];
  signatures?: RawSignature[];
}

function toWorkOrderUpdatePayload(doc: any): WorkOrderUpdatePayload {
  const plain = typeof doc.toObject === "function"
    ? doc.toObject({ getters: true, virtuals: false })
    : doc;
  return {
    ...plain,
    _id: (plain._id as Types.ObjectId | string)?.toString(),
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
    const items = await WorkOrder.find({ tenantId });
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

    const { assignees, checklists, partsUsed, signatures, ...rest } = parsed.data;
    const validParts = validateItems(res, partsUsed, p => Types.ObjectId.isValid(p.partId), 'part');
    if (partsUsed && !validParts) return;
    const validAssignees = validateItems(res, assignees, id => Types.ObjectId.isValid(id), 'assignee');
    if (assignees && !validAssignees) return;
    const validChecklists = validateItems(res, checklists, c => typeof c.description === 'string', 'checklist');
    if (checklists && !validChecklists) return;
    const validSignatures = validateItems(res, signatures, s => Types.ObjectId.isValid(s.userId), 'signature');
    if (signatures && !validSignatures) return;
    const newItem = new WorkOrder({
      ...rest,
      ...(validAssignees && { assignees: mapAssignees(validAssignees) }),
      ...(validChecklists && { checklists: mapChecklists(validChecklists) }),
      ...(validParts && { partsUsed: mapPartsUsed(validParts) }),
      ...(validSignatures && { signatures: mapSignatures(validSignatures) }),
      tenantId,
    });
    const saved = await newItem.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
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
    const update: UpdateWorkOrderBody = parsed.data as UpdateWorkOrderBody;
    if (update.partsUsed) {
      const validParts = validateItems(res, update.partsUsed, p => Types.ObjectId.isValid(p.partId), 'part');
      if (!validParts) return;
      update.partsUsed = mapPartsUsed(validParts);
    }
    if (update.assignees) {
      const validAssignees = validateItems(res, update.assignees, id => Types.ObjectId.isValid(id), 'assignee');
      if (!validAssignees) return;
      update.assignees = mapAssignees(validAssignees);
    }
    if (update.checklists) {
      const validChecklists = validateItems(res, update.checklists, c => typeof c.description === 'string', 'checklist');
      if (!validChecklists) return;
      update.checklists = mapChecklists(validChecklists);
    }
    if (update.signatures) {
      const validSignatures = validateItems(res, update.signatures, s => Types.ObjectId.isValid(s.userId), 'signature');
      if (!validSignatures) return;
      update.signatures = mapSignatures(validSignatures);
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
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
    const before = workOrder.toObject();
    workOrder.status = 'in_progress';
    const saved = await workOrder.save();
    const userIdStr = (req.user as any)?._id || (req.user as any)?.id;
    const userId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
    await writeAuditLog({
      tenantId,
      userId,
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
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
