/*
 * SPDX-License-Identifier: MIT
 */

import type { ParsedQs } from 'qs';
import type { ParamsDictionary } from 'express-serve-static-core';
import mongoose, { type LeanDocument } from 'mongoose';

import AuditLog, { type AuditLogDocument } from '../models/AuditLog';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import handleControllerError from '../utils/handleControllerError';

type AuditQuery = ParsedQs & {
  limit?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
};

type AuditLogLean = LeanDocument<AuditLogDocument>;

export const getAuditLogs: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  AuditQuery
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const limitParam = req.query.limit ?? '10';
    const limit = Math.min(parseInt(String(limitParam), 10), 100);
    const filter: Record<string, unknown> = { tenantId };
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) {
      if (!mongoose.isValidObjectId(req.query.entityId) && req.query.entityId !== '*') {
        sendResponse(res, null, 'Invalid entityId', 400);
        return;
      }
      filter.entityId = req.query.entityId === '*' ? { $exists: true } : req.query.entityId;
    }
    if (req.query.userId) {
      if (!mongoose.isValidObjectId(req.query.userId)) {
        sendResponse(res, null, 'Invalid userId', 400);
        return;
      }
      filter.userId = req.query.userId;
    }

    const logs = await AuditLog.find(filter)
      .sort({ ts: -1 })
      .limit(limit)
      .lean<AuditLogLean>()
      .exec();
    sendResponse(res, logs);
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};
