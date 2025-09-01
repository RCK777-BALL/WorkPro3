import { AuthedRequest } from '../types/AuthedRequest';
import { AuthedRequestHandler } from '../types/AuthedRequestHandler';
import WorkOrder from '../models/WorkOrder';
import { emitWorkOrderUpdate } from '../server';
import { validationResult } from 'express-validator';
import notifyUser from '../utils/notify';
import { getWorkOrderAssistance } from '../services/aiCopilot';

export const getAllWorkOrders: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const items = await WorkOrder.find({ tenantId: req.tenantId });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const searchWorkOrders: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { status, priority, startDate, endDate } = req.query;
    const query: any = { tenantId: req.tenantId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.dateCreated = {};
      if (startDate) query.dateCreated.$gte = new Date(startDate as string);
      if (endDate) query.dateCreated.$lte = new Date(endDate as string);
    }

    const items = await WorkOrder.find(query);
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getWorkOrderById: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const item = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createWorkOrder: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const newItem = new WorkOrder({ ...req.body, tenantId: req.tenantId });
    const saved = await newItem.save();
    emitWorkOrderUpdate(saved);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateWorkOrder: AuthedRequestHandler = async (
  req,
  res,
  next
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
    emitWorkOrderUpdate(updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteWorkOrder: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const deleted = await WorkOrder.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    emitWorkOrderUpdate({ _id: req.params.id, deleted: true });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const approveWorkOrder: AuthedRequestHandler = async (
  req,
  res,
  next
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
    emitWorkOrderUpdate(saved);

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

export const assistWorkOrder: AuthedRequestHandler = async (
  req,
  res,
  next
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
