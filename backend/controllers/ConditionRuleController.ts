/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
 
 
import ConditionRule from '../models/ConditionRule';

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
    const newItem = new ConditionRule({ ...req.body, tenantId });
    const saved = await newItem.save();
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
    const updated = await ConditionRule.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, tenantId },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
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
    const deleted = await ConditionRule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
