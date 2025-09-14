/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { validationResult } from 'express-validator';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import { nextCronOccurrenceWithin } from '../services/PMScheduler';
import type { AuthedRequestHandler } from '../types/http';
import type {
  PMTaskRequest,
  PMTaskParams,
  PMTaskListResponse,
  PMTaskResponse,
  PMTaskCreateBody,
  PMTaskUpdateBody,
  PMTaskDeleteResponse,
  PMTaskGenerateWOResponse,
} from '../types/pmTask';
import type { ParamsDictionary } from 'express-serve-static-core';
import { writeAuditLog } from '../utils/audit';

export const getAllPMTasks: AuthedRequestHandler<ParamsDictionary, PMTaskListResponse> = async (
  req: PMTaskRequest,
  res,
  next,
) => {
  try {
    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    if (req.siteId) (filter as any).siteId = req.siteId;

    const tasks = await PMTask.find(filter);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

export const getPMTaskById: AuthedRequestHandler<PMTaskParams, PMTaskResponse> = async (
  req: PMTaskRequest<PMTaskParams>,
  res,
  next,
) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }

    const task = await PMTask.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!task) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const createPMTask: AuthedRequestHandler<ParamsDictionary, PMTaskResponse, PMTaskCreateBody> = async (
  req: PMTaskRequest<ParamsDictionary, PMTaskCreateBody>,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const payload = { ...req.body, tenantId, siteId: req.siteId };
    const task = await PMTask.create(payload);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'PMTask',
      entityId: task._id,
      after: task.toObject(),
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const updatePMTask: AuthedRequestHandler<PMTaskParams, PMTaskResponse | null, PMTaskUpdateBody> = async (
  req: PMTaskRequest<PMTaskParams, PMTaskUpdateBody>,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }

    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const existing = await PMTask.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const task = await PMTask.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true },
    );
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'PMTask',
      entityId: new Types.ObjectId(req.params.id),
      before: existing.toObject(),
      after: task?.toObject(),
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const deletePMTask: AuthedRequestHandler<PMTaskParams, PMTaskDeleteResponse> = async (
  req: PMTaskRequest<PMTaskParams>,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }

    const task = await PMTask.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });

    if (!task) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'PMTask',
      entityId: new Types.ObjectId(req.params.id),
      before: task.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const generatePMWorkOrders: AuthedRequestHandler<ParamsDictionary, PMTaskGenerateWOResponse> = async (
  req: PMTaskRequest,
  res,
  next,
) => {
  try {
    const now = new Date();
    const tasks = await PMTask.find({ tenantId: req.tenantId, active: true });
    let count = 0;
    for (const task of tasks) {
      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: task.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: next,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      } else if (task.rule?.type === 'meter' && task.rule.meterName) {
        const meter = await Meter.findOne({
          name: task.rule.meterName,
          tenantId: task.tenantId,
        });
        if (!meter) continue;
        const sinceLast = meter.currentValue - (meter.lastWOValue || 0);
        if (sinceLast >= (task.rule.threshold || 0)) {
          await WorkOrder.create({
            title: `Meter PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: meter.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: now,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          meter.lastWOValue = meter.currentValue;
          await meter.save();
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      }
    }
    res.json({ generated: count });
  } catch (err) {
    next(err);
  }
};
