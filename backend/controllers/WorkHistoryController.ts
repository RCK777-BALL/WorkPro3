/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types, type FilterQuery } from 'mongoose';

import WorkHistory, { type WorkHistoryDocument } from '../models/WorkHistory';
import { sendResponse, writeAuditLog, toEntityId } from '../utils';

export const getAllWorkHistories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {

  try {
    const tenantId = req.tenantId;
    const rawMemberId = Array.isArray(req.query.memberId)
      ? req.query.memberId[0]
      : req.query.memberId;

    const match: FilterQuery<WorkHistoryDocument> = {};
    if (tenantId) {
      match.tenantId = tenantId as any;
    }
    if (rawMemberId) {
      match.memberId = String(rawMemberId);
    }

    const items = await WorkHistory.find(match).lean().exec();

    if (rawMemberId) {
      const item = items[0] ?? null;
      sendResponse(res, item);
      return;
    }

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
    const tenantId = req.tenantId;
    const match: FilterQuery<WorkHistoryDocument> = { _id: req.params.id };
    if (tenantId) {
      match.tenantId = tenantId as any;
    }

    const item = await WorkHistory.findOne(match).lean().exec();
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
    const memberId = req.body?.memberId;
    if (!memberId) {
      sendResponse(res, null, 'memberId is required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await WorkHistory.findOne({ tenantId, memberId });
    if (existing) {
      sendResponse(res, null, 'Work history already exists for this member', 409);
      return;
    }
    const newItem = new WorkHistory({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'WorkHistory',
      entityId: toEntityId(saved._id as Types.ObjectId),
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
    const updated = await WorkHistory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, tenantId },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
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
