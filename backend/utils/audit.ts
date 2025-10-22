/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';
import logger from './logger';

export interface AuditLogPayload {
  tenantId?: Types.ObjectId | string;
  siteId?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  before?: unknown;
  after?: unknown;
  message?: string;
}

const toObjectId = (value: Types.ObjectId | string | undefined): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return undefined;
};

const normalize = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export async function writeAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    const tenantId = toObjectId(payload.tenantId);
    if (!tenantId) {
      logger.warn('writeAuditLog: missing tenantId');
      return;
    }

    await AuditLog.create({
      tenantId,
      siteId: toObjectId(payload.siteId),
      userId: toObjectId(payload.userId),
      action: payload.action,
      entityType: payload.entityType,
      entityId: toObjectId(payload.entityId),
      before: normalize(payload.before),
      after: normalize(payload.after),
      message: payload.message,
    });
  } catch (err) {
    logger.error('Failed to write audit log', err);
  }
}

export default writeAuditLog;
