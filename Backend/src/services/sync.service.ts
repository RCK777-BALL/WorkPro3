/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import OfflineAction from '../models/OfflineAction';

export type SyncActionInput = {
  id: string;
  entityType: string;
  entityId?: string;
  operation: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export const recordSyncActions = async (tenantId: string, userId: string, actions: SyncActionInput[]) => {
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const action of actions) {
    try {
      const existing = await OfflineAction.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
        'payload.idempotencyKey': action.idempotencyKey,
      });

      if (existing) {
        results.push({ id: action.id, status: 'ok' });
        continue;
      }

      await OfflineAction.create({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
        entityType: action.entityType,
        entityId: action.entityId ? new Types.ObjectId(action.entityId) : undefined,
        operation: action.operation,
        payload: action.payload,
        status: 'pending',
      });

      results.push({ id: action.id, status: 'ok' });
    } catch (error) {
      results.push({ id: action.id, status: 'error', error: error instanceof Error ? error.message : 'Failed' });
    }
  }

  return results;
};
