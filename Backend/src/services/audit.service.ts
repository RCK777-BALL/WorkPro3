/*
 * SPDX-License-Identifier: MIT
 */

import AuditLog, { type AuditLogDiffEntry, type AuditLogEntityRef } from '../models/AuditLog';

export type AuditActor = {
  id?: string;
  name?: string;
  email?: string;
};

export interface AuditEventInput {
  tenantId?: string;
  siteId?: string | null;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: unknown;
  after?: unknown;
  diff?: AuditLogDiffEntry[] | null;
  actor?: AuditActor;
}

export const writeAuditEvent = async (input: AuditEventInput) => {
  const entity: AuditLogEntityRef = {
    type: input.entityType,
    id: input.entityId ?? null,
    label: input.entityLabel ?? null,
  };

  await AuditLog.create({
    tenantId: input.tenantId,
    siteId: input.siteId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entity,
    actor: input.actor,
    before: input.before,
    after: input.after,
    diff: input.diff,
    ts: new Date(),
  });
};
