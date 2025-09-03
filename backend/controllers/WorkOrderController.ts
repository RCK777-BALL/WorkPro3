  import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../types/AuthedRequest';
  
import { AuthedRequestHandler } from '../types/AuthedRequestHandler';
import { Response, NextFunction } from 'express';
 
import WorkOrder from '../models/WorkOrder';
import { emitWorkOrderUpdate } from '../server';
import { validationResult } from 'express-validator';
import notifyUser from '../utils/notify';
import { AIAssistResult, getWorkOrderAssistance } from '../services/aiCopilot';
import { Types } from 'mongoose';
import { WorkOrderUpdatePayload } from '../types/Payloads';

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
  next: NextFunction
) => {
  try {
    const items = await WorkOrder.find({ tenantId: req.tenantId });
    return res.json(items);
  } catch (err) {
    return next(err);
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
export const searchWorkOrders: AuthedRequestHandler<
  unknown,
  any,
  unknown,
  ListQuery
> = async (
  req: AuthedRequest<unknown, any, unknown, ListQuery>,
  res: Response,
  next: NextFunction
) => {
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
  } catch (err) {
    next(err);
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
  req: { params: { id: any; }; tenantId: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: any) => void; },
  next: (arg0: unknown) => void
) => {
  try {
    const item = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
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
export const createWorkOrder: AuthedRequestHandler = async (
  req: { body: any; tenantId: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { errors: any; }): void; new(): any; }; }; },
  next: (arg0: unknown) => void
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
      const newItem = new WorkOrder({ ...req.body, tenantId: req.tenantId });
      const saved = await newItem.save();
      emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));
      res.status(201).json(saved);
  } catch (err) {
    next(err);
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
  req: { params: { id: any; }; tenantId: any; body: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { errors?: any; message?: string; }): any; new(): any; }; }; json: (arg0: any) => void; },
  next: (arg0: unknown) => void
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
      const updated = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
      if (!updated) return res.status(404).json({ message: 'Not found' });
      emitWorkOrderUpdate(toWorkOrderUpdatePayload(updated));
      res.json(updated);
  } catch (err) {
    next(err);
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
export const deleteWorkOrder: AuthedRequestHandler<IdParams> = async (
  req: AuthedRequest<IdParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const deleted = await WorkOrder.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    emitWorkOrderUpdate(toWorkOrderUpdatePayload({ _id: req.params.id, deleted: true }));
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
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
  req: { body: { status: any; }; params: { id: any; }; user: { _id: any; }; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: any) => void; },
  next: (arg0: unknown) => void
) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) return res.status(404).json({ message: 'Not found' });

    workOrder.approvalStatus = status;

    if (status === 'pending') {
      // user requesting approval
      // @ts-ignore
      workOrder.approvalRequestedBy = req.user?._id;
    } else {
      // approved or rejected
      // @ts-ignore
      workOrder.approvedBy = req.user?._id;
    }

      const saved = await workOrder.save();
      emitWorkOrderUpdate(toWorkOrderUpdatePayload(saved));

    const message =
      status === 'pending'
        ? `Approval requested for work order "${workOrder.title}"`
        : `Work order "${workOrder.title}" was ${status}`;

    if (workOrder.assignedTo) {
      // @ts-ignore
      await notifyUser(workOrder.assignedTo, message);
    }

    res.json(saved);
  } catch (err) {
    next(err);
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
  req: { params: { id: any; }; tenantId: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: AIAssistResult) => void; },
  next: (arg0: unknown) => void
) => {
  try {
    const workOrder = await WorkOrder.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!workOrder) return res.status(404).json({ message: 'Not found' });
    const result = await getWorkOrderAssistance({
      title: workOrder.title,
      description: workOrder.description || '',
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
