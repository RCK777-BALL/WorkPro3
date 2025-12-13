/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import MobileScanHistory, { type MobileScanOutcome } from '../models/MobileScanHistory';
import { writeAuditLog, type AuditActor } from '../utils';

export interface DecodedEntityRef {
  type?: string | null;
  id?: string | null;
  label?: string | null;
}

export interface RecordScanInput {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  rawValue: string;
  decodedEntity?: DecodedEntityRef;
  navigationTarget?: string | null;
  outcome: MobileScanOutcome;
  errorMessage?: string | null;
  actor?: AuditActor;
}

export interface ListScanInput {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const recordScanHistory = async (input: RecordScanInput) => {
  const doc = await MobileScanHistory.create({
    tenantId: input.tenantId,
    userId: input.userId,
    rawValue: input.rawValue,
    decodedType: input.decodedEntity?.type ?? undefined,
    decodedId: input.decodedEntity?.id ?? undefined,
    decodedLabel: input.decodedEntity?.label ?? undefined,
    navigationTarget: input.navigationTarget ?? undefined,
    outcome: input.outcome,
    errorMessage: input.errorMessage ?? undefined,
  });

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    ...(input.actor ? { actor: input.actor } : {}),
    action: 'mobile.scan.recorded',
    entityType: input.decodedEntity?.type ?? 'Scan',
    entityId: input.decodedEntity?.id ?? doc._id,
    entityLabel: input.decodedEntity?.label ?? undefined,
    after: {
      rawValue: input.rawValue,
      navigationTarget: input.navigationTarget ?? null,
      outcome: input.outcome,
      errorMessage: input.errorMessage ?? null,
      exportState: 'pending',
    },
  });

  return doc.toObject();
};

export const listScanHistory = async (input: ListScanInput) => {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const query = { tenantId: input.tenantId, userId: input.userId };

  const [items, total] = await Promise.all([
    MobileScanHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MobileScanHistory.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
    },
  };
};
