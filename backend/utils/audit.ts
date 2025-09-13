/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import AuditLog from '../models/AuditLog';
import logger from './logger';

export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string | unknown,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    if (!tenantId) return;
    await AuditLog.create({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      before,
      after,
      ts: new Date(),
    });
  } catch (err) {
    logger.error('audit log error', err);
  }
}
