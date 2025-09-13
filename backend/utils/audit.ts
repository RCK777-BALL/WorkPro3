/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';
import logger from './logger';

type AuditVal = unknown;

const normalize = (v: AuditVal): AuditVal => JSON.parse(JSON.stringify(v));


export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  targetId: string | Types.ObjectId,
  before?: AuditVal,
  after?: AuditVal,

): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const siteId = req.siteId;
    const userId = req.user?._id || req.user?.id;
    if (!tenantId) return;
    const payload = {
      tenantId,
      siteId,
      userId,
      action,
      entityType,
      entityId: String(targetId),
      before: before === undefined ? undefined : normalize(before),
      after: after === undefined ? undefined : normalize(after),

      ts: new Date(),
    };
    await AuditLog.create(payload);
  } catch (err) {
    logger.error('audit log error', err);
  }
}
