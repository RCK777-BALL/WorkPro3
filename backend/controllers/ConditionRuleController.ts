/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthedRequestHandler } from '../types/http';
import ConditionRule from '../models/ConditionRule';
import { sendResponse, writeAuditLog, toEntityId } from '../utils';

type ConditionRuleBody = Record<string, unknown>;

const getAllConditionRules: AuthedRequestHandler<ParamsDictionary> = async (
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

const getConditionRuleById: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const item = await ConditionRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, item);
  } catch (err) {
    next(err);
  }
};

const createConditionRule: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  ConditionRuleBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new ConditionRule({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'ConditionRule',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });
    sendResponse(res, saved, null, 201);
  } catch (err) {
    next(err);
  }
};

const updateConditionRule: AuthedRequestHandler<
  { id: string },
  unknown,
  ConditionRuleBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await ConditionRule.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await ConditionRule.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, tenantId },
      { returnDocument: 'after', runValidators: true }
    );
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'ConditionRule',
      entityId: toEntityId(req.params.id),
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

const deleteConditionRule: AuthedRequestHandler<{ id: string }> = async (
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await ConditionRule.findOneAndDelete({
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
      entityType: 'ConditionRule',
      entityId: toEntityId(req.params.id),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export {
  getAllConditionRules,
  getConditionRuleById,
  createConditionRule,
  updateConditionRule,
  deleteConditionRule,
};
