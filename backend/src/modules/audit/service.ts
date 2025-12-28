/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type ClientSession } from 'mongoose';

import AuditEntryModel, { type AuditEntryDocument } from './model';

export interface AuditEntryInput {
  tenantId: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
};

export const logAuditEntry = async (
  input: AuditEntryInput,
  session?: ClientSession,
): Promise<AuditEntryDocument> => {
  const payload = {
    tenantId: toObjectId(input.tenantId, 'tenant id'),
    module: input.module,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ? toObjectId(input.entityId, 'entity id') : undefined,
    actorId: input.actorId ? toObjectId(input.actorId, 'actor id') : undefined,
    metadata: input.metadata,
  };

  const [entry] = await AuditEntryModel.create([payload], session ? { session } : undefined);
  return entry;
};
