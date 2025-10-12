/*
 * SPDX-License-Identifier: MIT
 */

import type { ParsedQs } from 'qs';
import type { ParamsDictionary } from 'express-serve-static-core';
import AuditLog from '../models/AuditLog';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';

type AuditQuery = ParsedQs & {
  limit?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
};

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
    if (req.query.entityId) filter.entityId = req.query.entityId;
    if (req.query.userId) filter.userId = req.query.userId;

    const logs = await AuditLog.find(filter)
      .sort({ ts: -1 })
      .limit(limit)
      .lean();
    sendResponse(res, logs);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
