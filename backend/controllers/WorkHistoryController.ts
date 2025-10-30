/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { sendResponse } from '../utils/sendResponse';

import WorkHistory from '../models/WorkHistory';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
 
export const getAllWorkHistories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const query: FilterQuery<Record<string, unknown>> = {};
    const tenantId = req.tenantId;
    if (tenantId) {
      query.tenantId = tenantId;
    }

    const { performedBy } = req.query;
    if (typeof performedBy === 'string' && performedBy.trim().length > 0) {
      query.performedBy = performedBy.trim();
    }

    const items = await WorkHistory.find(query).lean().exec();
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getWorkHistoryById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const query: FilterQuery<Record<string, unknown>> = { _id: req.params.id };
    if (req.tenantId) {
      query.tenantId = req.tenantId;
    }

    const item = await WorkHistory.findOne(query).lean().exec();
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

export const createWorkHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!req.body?.performedBy) {
      sendResponse(res, null, 'performedBy is required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new WorkHistory({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'WorkHistory',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateWorkHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await WorkHistory.findOne({
      _id: req.params.id,
      tenantId,
    });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await WorkHistory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'WorkHistory',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    sendResponse(res, updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteWorkHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await WorkHistory.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'WorkHistory',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
