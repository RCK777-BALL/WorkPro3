/*
 * SPDX-License-Identifier: MIT
 */

import type { Types, Model } from 'mongoose';
import Asset from '../../../models/Asset';
import PMTask from '../../../models/PMTask';
import WorkOrder from '../../../models/WorkOrder';
import MobileOfflineAction from '../../../models/MobileOfflineAction';
import ConflictLog from '../../../services/conflicts/ConflictLog';

export interface LastSyncInput {
  workOrders?: string;
  pms?: string;
  assets?: string;
}

export interface OfflineActionInput {
  entityType: 'WorkOrder' | 'PMTask' | 'Asset' | string;
  entityId?: Types.ObjectId | string;
  operation: 'create' | 'update' | 'delete' | string;
  payload?: Record<string, unknown>;
  version?: number;
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
}

const entityModelMap: Record<string, Model<any>> = {
  WorkOrder,
  PMTask,
  Asset,
};

const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const fetchDeltas = async (
  tenantId: Types.ObjectId,
  lastSync: LastSyncInput,
): Promise<Record<string, unknown>> => {
  const workOrdersSince = parseDate(lastSync.workOrders);
  const pmSince = parseDate(lastSync.pms);
  const assetsSince = parseDate(lastSync.assets);

  const [workOrders, pms, assets] = await Promise.all([
    WorkOrder.find({ tenantId, ...(workOrdersSince ? { updatedAt: { $gt: workOrdersSince } } : {}) })
      .sort({ updatedAt: 1 })
      .lean(),
    PMTask.find({ tenantId, ...(pmSince ? { updatedAt: { $gt: pmSince } } : {}) })
      .sort({ updatedAt: 1 })
      .lean(),
    Asset.find({ tenantId, ...(assetsSince ? { updatedAt: { $gt: assetsSince } } : {}) })
      .sort({ updatedAt: 1 })
      .lean(),
  ]);

  return {
    workOrders,
    pms,
    assets,
    cursors: {
      workOrders: workOrders.at(-1)?.updatedAt ?? workOrdersSince ?? null,
      pms: pms.at(-1)?.updatedAt ?? pmSince ?? null,
      assets: assets.at(-1)?.updatedAt ?? assetsSince ?? null,
    },
  };
};

const findModel = (entityType: string): Model<any> | undefined => entityModelMap[entityType];

const isNewer = (existing?: Date, incoming?: number | Date): boolean => {
  if (!existing) return false;
  if (!incoming) return true;
  const incomingDate = typeof incoming === 'number' ? new Date(incoming) : incoming;
  return existing.getTime() > incomingDate.getTime();
};

export const applyOfflineActions = async (
  actions: OfflineActionInput[],
): Promise<{ processed: string[]; conflicts: ReturnType<ConflictLog['all']> }> => {
  const conflictLog = new ConflictLog();
  const processed: string[] = [];

  for (const action of actions) {
    const model = findModel(action.entityType);
    if (!model) continue;

    const targetId = action.entityId;
    const payload = {
      ...(action.payload ?? {}),
      tenantId: action.tenantId,
      updatedAt: new Date(),
    };

    if (action.operation === 'create') {
      const created = await model.create({
        _id: targetId,
        ...payload,
      });

      await MobileOfflineAction.create({
        tenantId: action.tenantId,
        userId: action.userId,
        entityType: action.entityType,
        entityId: created._id,
        operation: 'create',
        payload: action.payload ?? {},
      });
      processed.push(String(created._id));
      continue;
    }

    if (!targetId) continue;

    const existing = await model.findOne({ _id: targetId, tenantId: action.tenantId });
    if (!existing) {
      if (action.operation === 'update') {
        const created = await model.create({ _id: targetId, ...payload });
        processed.push(String(created._id));
        continue;
      }
      continue;
    }

    const existingUpdatedAt: Date | undefined = existing.updatedAt ?? undefined;
    if (isNewer(existingUpdatedAt, action.version)) {
      conflictLog.add({
        entityType: action.entityType,
        entityId: String(targetId),
        serverTimestamp: existingUpdatedAt ?? new Date(),
        clientVersion: action.version,
        resolvedWith: 'server',
      });
      continue;
    }

    if (action.operation === 'delete') {
      await model.deleteOne({ _id: targetId, tenantId: action.tenantId });
      processed.push(String(targetId));
      continue;
    }

    await model.updateOne({ _id: targetId, tenantId: action.tenantId }, { $set: payload });
    processed.push(String(targetId));
  }

  return { processed, conflicts: conflictLog.all() };
};

export default {
  fetchDeltas,
  applyOfflineActions,
};
