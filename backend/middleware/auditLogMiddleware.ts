/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import AuditLog, { type AuditLogDiffEntry, type AuditLogEntityRef } from '../models/AuditLog';
import logger from '../utils/logger';

export interface AuditLogContext {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: unknown;
  after?: unknown;
  diff?: AuditLogDiffEntry[] | null;
}

declare module 'express-serve-static-core' {
  interface Response {
    locals: {
      auditLogEntries?: AuditLogContext[];
      [key: string]: unknown;
    };
  }
}

export const recordAudit = (req: Request, res: Response, context: AuditLogContext): void => {
  if (!res.locals.auditLogEntries) {
    res.locals.auditLogEntries = [];
  }
  res.locals.auditLogEntries.push(context);
};

export const auditLogMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', async () => {
    const entries = res.locals.auditLogEntries;
    if (!entries?.length || res.statusCode >= 400) return;

    const actor = req.user
      ? {
          id: req.user._id,
          name: req.user.name ?? `${req.user.firstName ?? ''} ${req.user.lastName ?? ''}`.trim() || undefined,
          email: req.user.email,
        }
      : undefined;

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const entity: AuditLogEntityRef = {
            type: entry.entityType,
            id: entry.entityId,
            label: entry.entityLabel,
          };

          await AuditLog.create({
            tenantId: req.tenantId,
            siteId: req.siteId,
            userId: req.user?._id,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            entity,
            actor,
            before: entry.before,
            after: entry.after,
            diff: entry.diff,
            ts: new Date(),
          });
        } catch (err) {
          logger.warn({ err }, 'Failed to write audit log');
        }
      }),
    );
  });

  next();
};

export default auditLogMiddleware;
