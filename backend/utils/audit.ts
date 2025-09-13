/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';
import logger from './logger';

function normalize(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string | Types.ObjectId,
  before?: unknown,
  after?: unknown,
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
      before: normalize(before),
      after: normalize(after),
      ts: new Date(),
    });
  } catch (err) {
    logger.error('audit log error', err);
  }
}
