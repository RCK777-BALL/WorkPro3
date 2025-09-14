/*
 * SPDX-License-Identifier: MIT
 */

import WorkOrder from '../models/WorkOrder';
import type { AuthedRequestHandler } from '../types/http';
import { emitWorkOrderUpdate } from '../server';
import notifyUser from '../utils/notify';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';
import {
  workOrderCreateSchema,
  workOrderUpdateSchema,
  assignWorkOrderSchema,
  startWorkOrderSchema,
  completeWorkOrderSchema,
  cancelWorkOrderSchema,
  type WorkOrderComplete,
} from '../src/schemas/workOrder';

const mapAssignees = (assignees?: string[]) =>
  assignees?.map((id) => new Types.ObjectId(id));

const mapChecklists = (
  checklists?: { description: string; completed?: boolean }[],
) =>
  checklists?.map((c) => ({
    text: c.description,
    done: c.completed ?? false,
  }));

const mapPartsUsed = (
  parts?: { partId: string; quantity: number; cost?: number }[],
) =>
  parts?.map((p) => ({
    partId: new Types.ObjectId(p.partId),
    qty: p.quantity,
    cost: p.cost ?? 0,
  }));

const mapSignatures = (
  signatures?: { userId: string; signedAt?: Date }[],
) =>
  signatures?.map((s) => ({
    by: new Types.ObjectId(s.userId),
    ts: s.signedAt ?? new Date(),
  }));



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

interface CompleteWorkOrderBody extends WorkOrderComplete {
  photos?: string[];
  failureCode?: string;
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

type RawPart = {
  partId: string;
  quantity: number;
  cost?: number;
};

type RawChecklist = {
  description: string;
  completed?: boolean;
};

type RawSignature = {
  userId: string;
  signedAt?: Date;
};

function mapPartsUsed(parts: RawPart[]) {
  return parts.map((p) => ({
    partId: new Types.ObjectId(p.partId),
    qty: p.quantity,
    cost: p.cost ?? 0,
  }));
}

function mapChecklists(items: RawChecklist[]) {
  return items.map((c) => ({
    text: c.description,
    done: Boolean(c.completed),
  }));
}

function mapSignatures(items: RawSignature[]) {
  return items.map((s) => ({
    by: new Types.ObjectId(s.userId),
    ts: s.signedAt ? new Date(s.signedAt) : new Date(),
  }));
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
export const getAllWorkOrders: AuthedRequestHandler = async (req, res, next) => {
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
export const searchWorkOrders: AuthedRequestHandler = async (req, res, next) => {
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
export const getWorkOrderById: AuthedRequestHandler = async (req, res, next) => {
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

export const createWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const newItem = new WorkOrder({
      ...rest,
      ...(assignees && { assignees: mapAssignees(assignees) }),
      ...(checklists && { checklists: mapChecklists(checklists) }),
      ...(partsUsed && { partsUsed: mapPartsUsed(partsUsed) }),

      ...(signatures && { signatures: mapSignatures(signatures) }),
      tenantId,
    });
    const saved = await newItem.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'WorkOrder',
      entityId: saved._id,
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
export const updateWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const update: any = parsed.data;
    if (update.assignees) {
      update.assignees = mapAssignees(update.assignees);
    }
    if (update.checklists) {
      update.checklists = mapChecklists(update.checklists);
    }
    if (update.partsUsed) {
      update.partsUsed = mapPartsUsed(update.partsUsed);
    }
    if (update.signatures) {
      update.signatures = mapSignatures(update.signatures);

    }
    const existing = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      update,
      { new: true, runValidators: true }
    );
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
      entityId: req.params.id,
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
export const deleteWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
      entityId: req.params.id,
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
 
export const approveWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'approve',
      entityType: 'WorkOrder',
      entityId: req.params.id,
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
 
export const assignWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
      workOrder.assignees = mapAssignees(parsed.data.assignees) || [];
    }
    const saved = await workOrder.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'assign',
      entityType: 'WorkOrder',
      entityId: req.params.id,
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

export const startWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'start',
      entityType: 'WorkOrder',
      entityId: req.params.id,
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

export const completeWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    if (Array.isArray(body.partsUsed)) workOrder.partsUsed = mapPartsUsed(body.partsUsed) || [];
    if (Array.isArray(body.checklists)) workOrder.checklists = mapChecklists(body.checklists) || [];
    if (Array.isArray(body.signatures)) workOrder.signatures = mapSignatures(body.signatures) || [];

    if (Array.isArray(body.photos)) workOrder.photos = body.photos;
    if (body.failureCode !== undefined) workOrder.failureCode = body.failureCode;

    const saved = await workOrder.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'complete',
      entityType: 'WorkOrder',
      entityId: req.params.id,
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

export const cancelWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'cancel',
      entityType: 'WorkOrder',
      entityId: req.params.id,
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

export const assistWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
