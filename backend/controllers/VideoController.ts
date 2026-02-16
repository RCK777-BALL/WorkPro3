/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import Video from '../models/Video';
import { sendResponse, writeAuditLog, toEntityId } from '../utils';

export const getAllVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Video.find().lean().exec();
    sendResponse(res, items);
  } catch (err) {
    next(err);
  }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Video.findById(req.params.id).lean().exec();
    if (!item) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, item);
  } catch (err) {
    next(err);
  }
};

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new Video({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Video',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Video.findById(req.params.id);
    if (!existing) return sendResponse(res, null, 'Not found', 404);
    const updated = await Video.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Video',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Video.findByIdAndDelete(req.params.id);
    if (!deleted) return sendResponse(res, null, 'Not found', 404);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Video',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
