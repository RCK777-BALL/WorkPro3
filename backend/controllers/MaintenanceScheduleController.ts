/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { validationResult } from 'express-validator';
import MaintenanceSchedule from '../models/MaintenanceSchedule';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';

const extractPayload = (body: Record<string, unknown>) => {
  const {
    title,
    description,
    assetId,
    frequency,
    nextDue,
    estimatedDuration,
    instructions,
    type,
    repeatConfig,
    parts,
    lastCompleted,
    lastCompletedBy,
    assignedTo,
  } = body as Record<string, unknown>;

  const repeat = repeatConfig && typeof repeatConfig === 'object'
    ? {
        interval: (repeatConfig as Record<string, unknown>).interval,
        unit: (repeatConfig as Record<string, unknown>).unit,
        endDate: (repeatConfig as Record<string, unknown>).endDate,
        occurrences: (repeatConfig as Record<string, unknown>).occurrences,
      }
    : undefined;

  return {
    title,
    description,
    assetId,
    frequency,
    nextDue,
    estimatedDuration,
    instructions,
    type,
    repeatConfig: repeat,
    parts,
    lastCompleted,
    lastCompletedBy,
    assignedTo,
  };
};

export const listMaintenanceSchedules: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const schedules = await MaintenanceSchedule.find({ tenantId })
      .sort({ nextDue: 1, createdAt: -1 })
      .lean();

    sendResponse(res, schedules);
  } catch (err) {
    next(err);
  }
};

export const getMaintenanceSchedule: AuthedRequestHandler<{ id: string }> = async (
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

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }

    const schedule = await MaintenanceSchedule.findOne({ _id: id, tenantId }).lean();
    if (!schedule) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const createMaintenanceSchedule: AuthedRequestHandler = async (req, res, next) => {
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

    const payload = extractPayload(req.body);
    const schedule = await MaintenanceSchedule.create({
      ...payload,
      tenantId,
    });

    const userId = (req.user as any)?._id ?? (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId ? toEntityId(userId as string | Types.ObjectId) : undefined,
      action: 'create',
      entityType: 'MaintenanceSchedule',
      entityId: toEntityId(schedule._id as Types.ObjectId),
      after: schedule.toObject(),
    });

    sendResponse(res, schedule.toObject(), null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateMaintenanceSchedule: AuthedRequestHandler<{ id: string }> = async (
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

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }

    const existing = await MaintenanceSchedule.findOne({ _id: id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const payload = extractPayload(req.body);
    const updated = await MaintenanceSchedule.findOneAndUpdate(
      { _id: id, tenantId },
      payload,
      { new: true, runValidators: true },
    );

    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const userId = (req.user as any)?._id ?? (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId ? toEntityId(userId as string | Types.ObjectId) : undefined,
      action: 'update',
      entityType: 'MaintenanceSchedule',
      entityId: toEntityId(updated._id as Types.ObjectId),
      before: existing.toObject(),
      after: updated.toObject(),
    });

    sendResponse(res, updated.toObject());
  } catch (err) {
    next(err);
  }
};

export const deleteMaintenanceSchedule: AuthedRequestHandler<{ id: string }> = async (
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

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }

    const existing = await MaintenanceSchedule.findOneAndDelete({ _id: id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const userId = (req.user as any)?._id ?? (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId ? toEntityId(userId as string | Types.ObjectId) : undefined,
      action: 'delete',
      entityType: 'MaintenanceSchedule',
      entityId: toEntityId(existing._id as Types.ObjectId),
      before: existing.toObject(),
    });

    sendResponse(res, { success: true });
  } catch (err) {
    next(err);
  }
};
