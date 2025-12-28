/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Asset from '../models/Asset';
import SlaPolicy, { type SlaPolicyDocument } from '../models/SlaPolicy';
import type { WorkOrderDocument } from '../models/WorkOrder';

const toObjectId = (value: Types.ObjectId | undefined | null) => {
  if (!value) return undefined;
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
};

const buildPolicyMatch = (tenantId: Types.ObjectId, siteId?: Types.ObjectId, assetCategory?: string) => {
  const match: { tenantId: Types.ObjectId; $and: Array<Record<string, unknown>> } = {
    tenantId,
    $and: [],
  };
  if (siteId) {
    match.$and.push({ $or: [{ siteId }, { siteId: { $exists: false } }, { siteId: null }] });
  } else {
    match.$and.push({ $or: [{ siteId: { $exists: false } }, { siteId: null }] });
  }

  if (assetCategory) {
    match.$and.push({ $or: [{ assetCategory }, { assetCategory: { $exists: false } }, { assetCategory: null }] });
  } else {
    match.$and.push({ $or: [{ assetCategory: { $exists: false } }, { assetCategory: null }] });
  }

  return match;
};

export const getActiveSlaPolicy = async (
  tenantId: Types.ObjectId,
  siteId?: Types.ObjectId,
  assetCategory?: string,
): Promise<SlaPolicyDocument | null> => {
  const match = buildPolicyMatch(tenantId, siteId, assetCategory);

  const [policy] = await SlaPolicy.aggregate<
    SlaPolicyDocument & { siteRank: number; assetRank: number }
  >([
    { $match: match },
    {
      $addFields: {
        siteRank: {
          $cond: [
            { $eq: ['$siteId', siteId ?? null] },
            2,
            { $cond: [{ $ifNull: ['$siteId', false] }, 1, 0] },
          ],
        },
        assetRank: {
          $cond: [
            { $eq: ['$assetCategory', assetCategory ?? null] },
            2,
            { $cond: [{ $ifNull: ['$assetCategory', false] }, 1, 0] },
          ],
        },
      },
    },
    { $sort: { siteRank: -1, assetRank: -1, updatedAt: -1 } },
    { $limit: 1 },
  ]);

  return (policy as unknown as SlaPolicyDocument | undefined) ?? null;
};

const mapEscalations = (policy: SlaPolicyDocument['escalations']) =>
  (policy ?? []).map((entry) => ({
    trigger: entry.trigger,
    thresholdMinutes: entry.thresholdMinutes,
    escalateTo: entry.escalateTo,
    channel: entry.channel ?? 'email',
    priority: entry.priority,
    reassign: entry.reassign,
    maxRetries: entry.maxRetries ?? 0,
    retryBackoffMinutes: entry.retryBackoffMinutes ?? 30,
    retryCount: 0,
    templateKey: entry.templateKey,
  }));

export const applySlaPolicyToWorkOrder = async (workOrder: WorkOrderDocument) => {
  const tenantId = toObjectId(workOrder.tenantId);
  if (!tenantId) return;
  const siteId = toObjectId(workOrder.siteId);
  let assetCategory: string | undefined;

  if (workOrder.assetId) {
    const asset = await Asset.findById(workOrder.assetId).lean();
    assetCategory = asset?.type ?? undefined;
  }

  const policy = await getActiveSlaPolicy(tenantId, siteId, assetCategory);
  if (!policy) return;

  const now = Date.now();
  if (policy.responseMinutes && !workOrder.slaResponseDueAt) {
    workOrder.slaResponseDueAt = new Date(now + policy.responseMinutes * 60 * 1000);
  }
  if (policy.resolveMinutes && !workOrder.slaResolveDueAt) {
    workOrder.slaResolveDueAt = new Date(now + policy.resolveMinutes * 60 * 1000);
  }
  workOrder.slaTargets = {
    responseMinutes: policy.responseMinutes ?? undefined,
    resolveMinutes: policy.resolveMinutes ?? undefined,
    responseDueAt: workOrder.slaResponseDueAt ?? undefined,
    resolveDueAt: workOrder.slaResolveDueAt ?? undefined,
    source: 'policy',
  };

  if (policy.escalations?.length) {
    workOrder.slaEscalations = mapEscalations(policy.escalations) as any;
  }

  workOrder.slaPolicyId = policy._id;

  if (workOrder.timeline) {
    workOrder.timeline.push({
      label: 'SLA policy applied',
      createdAt: new Date(),
      type: 'sla',
    });
  }
};

export default applySlaPolicyToWorkOrder;
