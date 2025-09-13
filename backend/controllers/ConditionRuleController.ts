/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';


import ConditionRule from '../models/ConditionRule';
import { writeAuditLog } from '../utils/audit';

export const getAllConditionRules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await ConditionRule.find({ tenantId: req.tenantId });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getConditionRuleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await ConditionRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createConditionRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new ConditionRule({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'ConditionRule',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateConditionRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await ConditionRule.findOne({ _id: req.params.id, tenantId });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const updated = await ConditionRule.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, tenantId },
      { new: true, runValidators: true }
    );
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'ConditionRule',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteConditionRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await ConditionRule.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'ConditionRule',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
