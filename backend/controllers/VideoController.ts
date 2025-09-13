/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import Video from '../models/Video';
import { writeAuditLog } from '../utils/audit';

export const getAllVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Video.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Video.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new Video({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Video',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Video.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const updated = await Video.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Video',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Video.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Video',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
