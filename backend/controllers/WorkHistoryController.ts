/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import WorkHistory from '../models/WorkHistory';
import { writeAuditLog } from '../utils/audit';
 
 export const getAllWorkHistories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
 
  try {
    const items = await WorkHistory.find();
    res.json(items);
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
    const item = await WorkHistory.findById(req.params.id);
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

export const createWorkHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new WorkHistory({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'WorkHistory',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
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
    const tenantId = (req as any).tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await WorkHistory.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
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
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
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
    const tenantId = (req as any).tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await WorkHistory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'WorkHistory',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
