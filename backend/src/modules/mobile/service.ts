/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import Asset from '../../../models/Asset';
import PMTask from '../../../models/PMTask';
import WorkOrder from '../../../models/WorkOrder';
import MobileOfflineAction from '../../../models/MobileOfflineAction';
import ConflictLog from '../../../services/conflicts/ConflictLog';
import { resolveConflict, type VectorClock } from './conflictResolution';

export interface LastSyncInput {
  workOrders?: string | undefined;
  pms?: string | undefined;
  assets?: string | undefined;
}

export interface OfflineActionInput {
  entityType: 'WorkOrder' | 'PMTask' | 'Asset' | string;
  entityId?: Types.ObjectId | string;
  operation: 'create' | 'update' | 'delete' | string;
  payload?: Record<string, unknown>;
  version?: number;
  vector?: VectorClock;
  fieldTimestamps?: Record<string, number>;
  clientId?: string;
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
  tenantId: Types.ObjectId | string,
  lastSync: LastSyncInput,
): Promise<Record<string, unknown>> => {
  const normalizedTenantId =
    typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;

  const workOrdersSince = parseDate(lastSync.workOrders);
  const pmSince = parseDate(lastSync.pms);
  const assetsSince = parseDate(lastSync.assets);

  const [workOrders, pms, assets] = await Promise.all([
    WorkOrder.find({
      tenantId: normalizedTenantId,
      ...(workOrdersSince ? { updatedAt: { $gt: workOrdersSince } } : {}),
    })
      .sort({ updatedAt: 1 })
      .lean(),
    PMTask.find({ tenantId: normalizedTenantId, ...(pmSince ? { updatedAt: { $gt: pmSince } } : {}) })
      .sort({ updatedAt: 1 })
      .lean(),
    Asset.find({ tenantId: normalizedTenantId, ...(assetsSince ? { updatedAt: { $gt: assetsSince } } : {}) })
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

export const applyOfflineActions = async (
  actions: OfflineActionInput[],
): Promise<{
  processed: string[];
  conflicts: ReturnType<ConflictLog['all']>;
  resolutions: ReturnType<ConflictLog['all']>;
}> => {
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

    const existing = await model.findOne({ _id: targetId, tenantId: action.tenantId }).lean<Record<string, any>>();
    if (!existing) {
      if (action.operation === 'update') {
        const created = await model.create({ _id: targetId, ...payload });
        processed.push(String(created._id));
        continue;
      }
      continue;
    }

    const clientTimestamp = action.version !== undefined ? new Date(action.version) : undefined;
    const resolution = resolveConflict({
      existing,
      incoming: payload,
      entityType: action.entityType,
      entityId: targetId,
      clientTimestamp,
      clientVector: action.vector,
      clientId: action.clientId ?? action.userId?.toString(),
      fieldTimestamps: action.fieldTimestamps,
    });

    if (!resolution.applyChange) {
      conflictLog.add(resolution.metadata);
      continue;
    }

    if (action.operation === 'delete') {
      await model.deleteOne({ _id: targetId, tenantId: action.tenantId });
      conflictLog.add({
        ...resolution.metadata,
        resolvedWith: 'client',
        appliedFields: [...new Set([...resolution.metadata.appliedFields, 'delete'])],
      });
      processed.push(String(targetId));
      continue;
    }

    const mergedPayload = { ...resolution.merged, updatedAt: payload.updatedAt ?? new Date() };
    await model.updateOne({ _id: targetId, tenantId: action.tenantId }, { $set: mergedPayload });
    conflictLog.add(resolution.metadata);
    processed.push(String(targetId));
  }

  const resolutions = conflictLog.all();
  return { processed, conflicts: resolutions, resolutions };
};

export default {
  fetchDeltas,
  applyOfflineActions,
};
