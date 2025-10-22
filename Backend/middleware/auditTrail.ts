/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { Types } from 'mongoose';

import AuditLog from '../models/AuditLog';
import type { AuthedRequest } from '../types/http';

export interface AuditContext {
  module: string;
  action: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
}

const toObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

export const auditTrail = (module: string, action?: string): RequestHandler => (req, res, next) => {
  const context: AuditContext = {
    module,
    action: action ?? `${req.method.toUpperCase()} ${req.baseUrl}${req.path}`,
  };

  (res.locals as { auditContext?: AuditContext }).auditContext = context;

  res.on('finish', () => {
    const statusCode = res.statusCode;
    if (statusCode >= 400) return;

    const { auditContext } = res.locals as { auditContext?: AuditContext };
    if (!auditContext) return;

    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    if (!tenantId) return;

    const userId = (authedReq.user?.id ?? authedReq.user?._id) as string | undefined;
    const entityId = auditContext.entityId ?? req.params?.section ?? req.originalUrl;

    void AuditLog.create({
      tenantId: toObjectId(tenantId) ?? tenantId,
      userId: toObjectId(userId) ?? userId,
      action: auditContext.action,
      entityType: auditContext.module,
      entityId,
      before: auditContext.before ?? null,
      after: auditContext.after ?? null,
      module: auditContext.module,
      details: {
        method: req.method,
        path: req.originalUrl,
        ...auditContext.details,
      },
      ts: new Date(),
    }).catch(() => {
      // intentionally swallow logging failures to avoid impacting requests
    });
  });

  next();
};

export default auditTrail;

