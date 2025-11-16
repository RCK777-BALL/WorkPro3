/*
 * SPDX-License-Identifier: MIT
 */

import { Error as MongooseError, Types } from 'mongoose';
import { validationResult } from 'express-validator';
import PMTask, { PMTaskDocument } from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import { nextCronOccurrenceWithin } from '../services/PMScheduler';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';

import type {
  PMTaskParams,
  PMTaskListResponse,
  PMTaskResponse,
  PMTaskCreateBody,
  PMTaskUpdateBody,
  PMTaskDeleteResponse,
  PMTaskGenerateWOResponse,
} from '../types/pmTask';
import type { ParamsDictionary } from 'express-serve-static-core';
import { auditAction } from '../utils/audit';
import { toEntityId } from '../utils/ids';


export const getAllPMTasks: AuthedRequestHandler<ParamsDictionary, PMTaskListResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const { tenantId, siteId } = req;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filter: Record<string, unknown> = { tenantId };
    if (siteId) {
      filter.siteId = siteId;
    }

    const tasks = await PMTask.find(filter);
    sendResponse(res, tasks);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const getPMTaskById: AuthedRequestHandler<PMTaskParams, PMTaskResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const task = await PMTask.findOne({
      _id: req.params.id,
      tenantId,
    });

    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, task);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const createPMTask: AuthedRequestHandler<ParamsDictionary, PMTaskResponse, PMTaskCreateBody> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, null, { errors: errors.array() }, 400);
      return;
    }
    const payload = { ...req.body, tenantId, siteId: req.siteId };
    const task: PMTaskDocument = await PMTask.create(payload);
    const targetId: string | Types.ObjectId = (toEntityId(task._id as Types.ObjectId) ?? task._id) as string | Types.ObjectId;
    await auditAction(req as any, 'create', 'PMTask', targetId, undefined, task.toObject());
    sendResponse(res, task, null, 201);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const updatePMTask: AuthedRequestHandler<PMTaskParams, PMTaskResponse | null, PMTaskUpdateBody> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, null, { errors: errors.array() }, 400);
      return;
    }

    const existing = await PMTask.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const task = await PMTask.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const targetId: string | Types.ObjectId = (toEntityId(task!._id as Types.ObjectId) ?? task!._id) as string | Types.ObjectId;
    await auditAction(
      req as any,
      'update',
      'PMTask',
      targetId,
      existing.toObject(),
      task.toObject(),
    );
    sendResponse(res, task);
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const deletePMTask: AuthedRequestHandler<PMTaskParams, PMTaskDeleteResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const task = await PMTask.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });

    if (!task) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const targetId: string | Types.ObjectId = (toEntityId(task._id as Types.ObjectId) ?? task._id) as string | Types.ObjectId;
    await auditAction(
      req as any,
      'delete',
      'PMTask',
      targetId,
      task.toObject(),
      undefined,
    );
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};

export const generatePMWorkOrders: AuthedRequestHandler<ParamsDictionary, PMTaskGenerateWOResponse> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const now = new Date();
    const tasks = await PMTask.find({ tenantId, active: true });
    let count = 0;
    for (const task of tasks) {
      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'requested',
            type: 'preventive',
            ...(task.asset ? { assetId: task.asset } : {}),
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
            status: 'requested',
            type: 'preventive',
            assetId: meter.asset,
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
    sendResponse(res, { generated: count });
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      sendResponse(res, null, err.message, 400);
      return;
    }
    next(err);
  }
};
