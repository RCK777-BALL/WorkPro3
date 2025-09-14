/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';


import ConditionRule from '../models/ConditionRule';
import { writeAuditLog } from '../utils/audit';

export const getAllConditionRules: AuthedRequestHandler<ParamsDictionary> = async (
  req,
  res,
  next,
) => {
  try {
    const items = await ConditionRule.find({ tenantId: req.tenantId });
    sendResponse(res, items);
  } catch (err) {
    next(err);
  }
};

export const getConditionRuleById: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const item = await ConditionRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, item);
  } catch (err) {
    next(err);
  }
};

export const createConditionRule: AuthedRequestHandler<ParamsDictionary> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
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
    sendResponse(res, saved, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateConditionRule: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await ConditionRule.findOne({ _id: req.params.id, tenantId });
    if (!existing) return sendResponse(res, null, 'Not found', 404);
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
      entityId: new Types.ObjectId(req.params.id),
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteConditionRule: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await ConditionRule.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });
    if (!deleted) return sendResponse(res, null, 'Not found', 404);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'ConditionRule',
      entityId: new Types.ObjectId(req.params.id),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
