/*
 * SPDX-License-Identifier: MIT
 */

import WorkOrder from '../models/WorkOrder';
import type { AuthedRequestHandler } from '../types/http';
import { emitWorkOrderUpdate } from '../server';
import { validationResult } from 'express-validator';
import notifyUser from '../utils/notify';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';
import { filterFields } from '../utils/filterFields';
import { logAudit } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

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
      query.dateCreated = {};
      if (start) query.dateCreated.$gte = start;
      if (end) query.dateCreated.$lte = end;
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
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      sendResponse(res, null, errors.array(), 400);
      return;
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const payload = filterFields(req.body, workOrderCreateFields);
    const newItem = new WorkOrder({ ...payload, tenantId });
    const saved = await newItem.save();
    await logAudit(req, 'create', 'WorkOrder', saved._id, null, saved.toObject());
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
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      sendResponse(res, null, errors.array(), 400);
      return;
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const update = filterFields(req.body, workOrderUpdateFields);
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
    await logAudit(
      req,
      'update',
      'WorkOrder',
      req.params.id,
      existing.toObject(),
      updated.toObject()
    );
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
    await logAudit(req, 'delete', 'WorkOrder', req.params.id, deleted.toObject(), null);
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
    await logAudit(req, 'approve', 'WorkOrder', req.params.id, before, saved.toObject());
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
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'assigned';
    if (Array.isArray(req.body.assignees)) {
      workOrder.assignees = req.body.assignees;
    }
    const saved = await workOrder.save();
    await logAudit(req, 'assign', 'WorkOrder', req.params.id, before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    res.json(saved);
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
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'in_progress';
    const saved = await workOrder.save();
    await logAudit(req, 'start', 'WorkOrder', req.params.id, before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    res.json(saved);
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
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'completed';
    if (req.body.timeSpentMin !== undefined) workOrder.timeSpentMin = req.body.timeSpentMin;
    if (Array.isArray(req.body.partsUsed)) workOrder.partsUsed = req.body.partsUsed;
    if (Array.isArray(req.body.checklists)) workOrder.checklists = req.body.checklists;
    if (Array.isArray(req.body.photos)) workOrder.photos = req.body.photos;
    if (req.body.failureCode !== undefined) workOrder.failureCode = req.body.failureCode;
    const saved = await workOrder.save();
    await logAudit(req, 'complete', 'WorkOrder', req.params.id, before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    res.json(saved);
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
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const workOrder = await WorkOrder.findOne({ _id: req.params.id, tenantId });
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const before = workOrder.toObject();
    workOrder.status = 'cancelled';
    const saved = await workOrder.save();
    await logAudit(req, 'cancel', 'WorkOrder', req.params.id, before, saved.toObject());
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    res.json(saved);
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
