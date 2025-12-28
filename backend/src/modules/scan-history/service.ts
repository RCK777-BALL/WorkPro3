/*
 * SPDX-License-Identifier: MIT
 */

import ScanHistory, { type ScanHistoryDocument, type ScanHistoryResolution } from '../../../models/ScanHistory';
import { writeAuditLog, type AuditActor } from '../../../utils/audit';
import type { SessionBinding } from '../../../utils/sessionBinding';

export interface ScanHistoryContext {
  tenantId: string;
  siteId?: string;
  userId?: string;
  actor?: AuditActor;
  session?: SessionBinding;
}

export interface ScanHistoryInput {
  rawValue: string;
  outcome: 'success' | 'failure';
  source?: string;
  resolution?: ScanHistoryResolution;
  error?: string;
  metadata?: Record<string, unknown>;
}

export const recordScanHistory = async (
  context: ScanHistoryContext,
  input: ScanHistoryInput,
): Promise<ScanHistoryDocument> => {
  const entry = await ScanHistory.create({
    tenantId: context.tenantId,
    siteId: context.siteId,
    userId: context.userId,
    session: context.session,
    rawValue: input.rawValue,
    outcome: input.outcome,
    source: input.source,
    resolution: input.resolution,
    error: input.error,
    metadata: input.metadata,
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    siteId: context.siteId,
    userId: context.userId,
    actor: context.actor,
    action: 'scan_history.create',
    entityType: 'scan_history',
    entityId: entry._id,
    after: {
      rawValue: entry.rawValue,
      outcome: entry.outcome,
      source: entry.source,
      resolution: entry.resolution,
      error: entry.error,
    },
  });

  return entry;
};
