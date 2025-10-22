/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';
import logger from './logger';
import { toObjectId } from './ids';

interface AuditPayload {
  tenantId: string | Types.ObjectId;
  siteId?: string | Types.ObjectId | null;
  userId?: string | Types.ObjectId | null;
  entityType: string;
  entityId: string | Types.ObjectId;
  action: string;
  before?: unknown;
  after?: unknown;
}

const normalize = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export async function writeAuditLog({
  tenantId,
  siteId,
  userId,
  entityType,
  entityId,
  action,
  before,
  after,
}: AuditPayload): Promise<void> {
  try {
    await AuditLog.create({
      tenantId: toObjectId(tenantId),
      siteId: siteId ? toObjectId(siteId) : undefined,
      userId: userId ? toObjectId(userId) : undefined,
      entityType,
      entityId: toObjectId(entityId),
      action,
      before: normalize(before),
      after: normalize(after),
      ts: new Date(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', err);
  }
}

export default {
  writeAuditLog,
};
