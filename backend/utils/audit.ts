/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';
import logger from './logger';
import { toEntityId } from '../src/utils/toEntityId';

type AuditVal = unknown;

const normalize = (v: AuditVal): AuditVal => JSON.parse(JSON.stringify(v));

interface AuditPayload {
  tenantId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string | Types.ObjectId;
  before?: AuditVal;
  after?: AuditVal;
}

export const toEntityId = (id: string | Types.ObjectId): Types.ObjectId =>
  typeof id === 'string' ? new Types.ObjectId(id) : id;

export async function writeAuditLog({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
}: AuditPayload): Promise<void> {
  try {
    if (!tenantId) return;
    const payload = {
      tenantId,
      userId: toEntityId(userId),
      action,
      entityType,
      entityId: toEntityId(entityId),
      before: before === undefined ? undefined : normalize(before),
      after: after === undefined ? undefined : normalize(after),
      ts: new Date(),
    };
    await AuditLog.create(payload);
  } catch (err) {
    logger.error('audit log error', err);
  }
}
