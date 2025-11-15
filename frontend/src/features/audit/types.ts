/*
 * SPDX-License-Identifier: MIT
 */

export interface AuditActor {
  id?: string;
  name?: string;
  email?: string;
}

export interface AuditDiffEntry {
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditEntityRef {
  type: string;
  id?: string;
  label?: string;
}

export interface AuditLog {
  _id: string;
  entityType: string;
  entityId?: string;
  entity?: AuditEntityRef;
  action: string;
  actor?: AuditActor;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: AuditDiffEntry[] | null;
  ts: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  count: number;
  nextCursor?: string;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  actor?: string;
  entityId?: string;
  start?: string;
  end?: string;
}
