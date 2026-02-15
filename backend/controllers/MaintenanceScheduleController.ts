/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { validationResult } from 'express-validator';
import MaintenanceSchedule from '../models/MaintenanceSchedule';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils';
import type {
  MaintenanceScheduleParams,
  MaintenanceScheduleBody,
  MaintenanceSchedulesResponse,
  MaintenanceScheduleResponse,
  MaintenanceScheduleDeleteResponse,
} from '../types/maintenanceSchedule';

const toDateOrUndefined = (value?: string | Date) => {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

const toUpdatePayload = (body: MaintenanceScheduleBody) => {
  const payload: Record<string, unknown> = {
    title: body.title,
    description: body.description,
    assetId: body.assetId,
    frequency: body.frequency,
    nextDue: toDateOrUndefined(body.nextDue),
    estimatedDuration: body.estimatedDuration,
    instructions: body.instructions,
    type: body.type,
    repeatConfig: {
      interval: body.repeatConfig.interval,
      unit: body.repeatConfig.unit,
      ...(toDateOrUndefined(body.repeatConfig.endDate)
        ? { endDate: toDateOrUndefined(body.repeatConfig.endDate) }
        : {}),
      ...(body.repeatConfig.occurrences && body.repeatConfig.occurrences > 0
        ? { occurrences: body.repeatConfig.occurrences }
        : {}),
    },
    parts: body.parts,
  };

  payload.lastCompleted = toDateOrUndefined(body.lastCompleted);
  payload.lastCompletedBy = body.lastCompletedBy?.trim()
    ? body.lastCompletedBy.trim()
    : undefined;
  payload.assignedTo = body.assignedTo?.trim()
    ? body.assignedTo.trim()
    : undefined;

  return payload;
};

export const listMaintenanceSchedules: AuthedRequestHandler<
  MaintenanceScheduleParams,
  MaintenanceSchedulesResponse
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filter: Record<string, unknown> = { tenantId };
    if (req.siteId) {
      filter.siteId = req.siteId;
    }

    const schedules = await MaintenanceSchedule.find(filter).sort({ nextDue: 1 });
    sendResponse(res, schedules);
  } catch (err) {
    next(err);
  }
};

export const getMaintenanceSchedule: AuthedRequestHandler<
  MaintenanceScheduleParams,
  MaintenanceScheduleResponse
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filter: Record<string, unknown> = {
      _id: req.params.id,
      tenantId,
    };

    if (req.siteId) {
      filter.siteId = req.siteId;
    }

    const schedule = await MaintenanceSchedule.findOne(filter);

    if (!schedule) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const createMaintenanceSchedule: AuthedRequestHandler<
  MaintenanceScheduleParams,
  MaintenanceScheduleResponse,
  MaintenanceScheduleBody
> = async (req, res, next) => {
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

    const payload = {
      ...toUpdatePayload(req.body),
      tenantId: new Types.ObjectId(tenantId),
      siteId: req.siteId ? new Types.ObjectId(req.siteId) : undefined,
    };

    const schedule = await MaintenanceSchedule.create(payload as any);
    sendResponse(res, schedule, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateMaintenanceSchedule: AuthedRequestHandler<
  MaintenanceScheduleParams,
  MaintenanceScheduleResponse,
  MaintenanceScheduleBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendResponse(res, null, { errors: errors.array() }, 400);
      return;
    }

    const filter: Record<string, unknown> = {
      _id: req.params.id,
      tenantId: new Types.ObjectId(tenantId),
    };

    if (req.siteId) {
      filter.siteId = new Types.ObjectId(req.siteId);
    }

    const schedule = await MaintenanceSchedule.findOneAndUpdate(
      filter,
      toUpdatePayload(req.body),
      { new: true },
    );

    if (!schedule) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const deleteMaintenanceSchedule: AuthedRequestHandler<
  MaintenanceScheduleParams,
  MaintenanceScheduleDeleteResponse
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const filter: Record<string, unknown> = {
      _id: req.params.id,
      tenantId: new Types.ObjectId(tenantId),
    };

    if (req.siteId) {
      filter.siteId = new Types.ObjectId(req.siteId);
    }

    const deleted = await MaintenanceSchedule.findOneAndDelete(filter);

    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    sendResponse(res, null, null, 204);
  } catch (err) {
    next(err);
  }
};
