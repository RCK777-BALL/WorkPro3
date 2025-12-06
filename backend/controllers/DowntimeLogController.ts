/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { sendResponse, writeAuditLog, toEntityId } from '../utils';
import {
  createDowntimeLog,
  deleteDowntimeLog,
  getDowntimeLog,
  listDowntimeLogs,
  updateDowntimeLog,
} from '../services/downtimeLogs';

export const getDowntimeLogsHandler = async (
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

    const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : undefined;
    const start = typeof req.query.start === 'string' ? new Date(req.query.start) : undefined;
    const end = typeof req.query.end === 'string' ? new Date(req.query.end) : undefined;

    const logs = await listDowntimeLogs(tenantId, { assetId, start, end });
    sendResponse(res, logs);
  } catch (err) {
    next(err);
  }
};

export const getDowntimeLogHandler = async (
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
    const log = await getDowntimeLog(tenantId, req.params.id);
    if (!log) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, log);
  } catch (err) {
    next(err);
  }
};

export const createDowntimeLogHandler = async (
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

    if (!req.body?.assetId || !req.body?.start) {
      sendResponse(res, null, 'assetId and start are required', 400);
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const created = await createDowntimeLog(tenantId, req.body);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'DowntimeLog',
      entityId: toEntityId(created._id as Types.ObjectId),
      after: created.toObject(),
    });
    sendResponse(res, created, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateDowntimeLogHandler = async (
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
    const before = await getDowntimeLog(tenantId, req.params.id);
    if (!before) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const updated = await updateDowntimeLog(tenantId, req.params.id, req.body);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'DowntimeLog',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: before,
      after: updated ?? undefined,
    });

    sendResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteDowntimeLogHandler = async (
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
    const deleted = await deleteDowntimeLog(tenantId, req.params.id);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'DowntimeLog',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: deleted,
    });

    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
