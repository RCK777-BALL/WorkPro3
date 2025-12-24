/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import SlaRule, { type SlaRuleDocument, type SlaRuleScope } from '../models/SlaRule';

interface SlaRuleMatchInput {
  tenantId: Types.ObjectId;
  scope: SlaRuleScope;
  siteId?: Types.ObjectId;
  assetCategory?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  workType?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
}

const buildMatch = (input: SlaRuleMatchInput) => {
  const match: { tenantId: Types.ObjectId; scope: SlaRuleScope; $and: Array<Record<string, unknown>> } = {
    tenantId: input.tenantId,
    scope: input.scope,
    $and: [],
  };

  if (input.siteId) {
    match.$and.push({ $or: [{ siteId: input.siteId }, { siteId: { $exists: false } }, { siteId: null }] });
  } else {
    match.$and.push({ $or: [{ siteId: { $exists: false } }, { siteId: null }] });
  }

  if (input.assetCategory) {
    match.$and.push({
      $or: [{ assetCategory: input.assetCategory }, { assetCategory: { $exists: false } }, { assetCategory: null }],
    });
  } else {
    match.$and.push({ $or: [{ assetCategory: { $exists: false } }, { assetCategory: null }] });
  }

  if (input.priority) {
    match.$and.push({ $or: [{ priority: input.priority }, { priority: { $exists: false } }, { priority: null }] });
  } else {
    match.$and.push({ $or: [{ priority: { $exists: false } }, { priority: null }] });
  }

  if (input.workType) {
    match.$and.push({ $or: [{ workType: input.workType }, { workType: { $exists: false } }, { workType: null }] });
  } else {
    match.$and.push({ $or: [{ workType: { $exists: false } }, { workType: null }] });
  }

  return match;
};

export const getActiveSlaRule = async (input: SlaRuleMatchInput): Promise<SlaRuleDocument | null> => {
  const match = buildMatch(input);

  const [rule] = await SlaRule.aggregate<
    SlaRuleDocument & {
      siteRank: number;
      assetRank: number;
      priorityRank: number;
      typeRank: number;
      defaultRank: number;
    }
  >([
    { $match: match },
    {
      $addFields: {
        siteRank: {
          $cond: [{ $eq: ['$siteId', input.siteId ?? null] }, 2, { $cond: [{ $ifNull: ['$siteId', false] }, 1, 0] }],
        },
        assetRank: {
          $cond: [
            { $eq: ['$assetCategory', input.assetCategory ?? null] },
            2,
            { $cond: [{ $ifNull: ['$assetCategory', false] }, 1, 0] },
          ],
        },
        priorityRank: {
          $cond: [{ $eq: ['$priority', input.priority ?? null] }, 2, { $cond: [{ $ifNull: ['$priority', false] }, 1, 0] }],
        },
        typeRank: {
          $cond: [{ $eq: ['$workType', input.workType ?? null] }, 2, { $cond: [{ $ifNull: ['$workType', false] }, 1, 0] }],
        },
        defaultRank: { $cond: ['$isDefault', 1, 0] },
      },
    },
    { $sort: { siteRank: -1, assetRank: -1, priorityRank: -1, typeRank: -1, defaultRank: -1, updatedAt: -1 } },
    { $limit: 1 },
  ]);

  return (rule as unknown as SlaRuleDocument | undefined) ?? null;
};

export default getActiveSlaRule;
