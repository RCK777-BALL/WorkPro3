import { Request, Response, NextFunction } from 'express';

import WorkOrder from '../models/WorkOrder';
import { emitWorkOrderUpdate } from '../server';
import { validationResult } from 'express-validator';
import notifyUser from '../utils/notify';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';
import { filterFields } from '../utils/filterFields';

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

// Single, shared param type for routes with :id
type IdParams = { id: string };
 

function toWorkOrderUpdatePayload(doc: any): WorkOrderUpdatePayload {
  const plain = typeof doc.toObject === "function"
    ? doc.toObject({ getters: true, virtuals: false })
    : doc;
  return {
    ...plain,
    _id: (plain._id as Types.ObjectId | string)?.toString(),
  } as WorkOrderUpdatePayload;
}

type SearchQuery = {
  status?: 'open' | 'in-progress' | 'on-hold' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
};

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
export const getAllWorkOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = await WorkOrder.find({ tenantId: req.tenantId });
    res.json(items);
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
export const searchWorkOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, priority, startDate, endDate } = req.query;
    const query: any = { tenantId: req.tenantId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.dateCreated = {};
      if (startDate) query.dateCreated.$gte = new Date(startDate);
      if (endDate) query.dateCreated.$lte = new Date(endDate);
    }

    const items = await WorkOrder.find(query);
    res.json(items);
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
export const getWorkOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
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
export const createWorkOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const payload = filterFields(req.body, workOrderCreateFields);
    const newItem = new WorkOrder({ ...payload, tenantId: req.tenantId });
    const saved = await newItem.save();
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
    res.status(201).json(saved);
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
export const updateWorkOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const update = filterFields(req.body, workOrderUpdateFields);
    const updated = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(updated));
    res.json(updated);
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
export const deleteWorkOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await WorkOrder.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    emitWorkOrderUpdate(toWorkOrderUpdatePayload({ _id: req.params.id, deleted: true }));
    res.json({ message: 'Deleted successfully' });
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
 
export const approveWorkOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
 
      const userIdStr = (req.user?._id as string | undefined) ?? req.user?.id;
      const userObjectId = userIdStr ? new Types.ObjectId(userIdStr) : undefined;
 
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    workOrder.approvalStatus = status;

       if (status === 'pending') {
        // user requesting approval
        if (userObjectId) workOrder.approvalRequestedBy = userObjectId;
      } else {
        // approved or rejected
        if (userObjectId) workOrder.approvedBy = userObjectId;
      }
 

    const saved = await workOrder.save();
    emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));

    const message =
      status === 'pending'
        ? `Approval requested for work order "${workOrder.title}"`
        : `Work order "${workOrder.title}" was ${status}`;

    if (workOrder.assignedTo) {
      await notifyUser(workOrder.assignedTo, message);
    }

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

export const assistWorkOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!workOrder) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const result = await getWorkOrderAssistance({
      title: workOrder.title,
      description: workOrder.description || '',
    });
     return res.json(result);
  } catch (err) {
    return next(err);
 
  }
};
