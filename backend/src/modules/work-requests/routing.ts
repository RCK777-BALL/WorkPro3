/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import RequestRoutingRule, { type RequestRoutingRuleDocument } from '../../../models/RequestRoutingRule';

export interface RoutingInput {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  requestType?: Types.ObjectId;
  assetTag?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
}

export type RoutingDecision =
  | (Pick<RequestRoutingRuleDocument, 'destination'> & { ruleId: Types.ObjectId })
  | undefined;

export const evaluateRoutingRules = async (input: RoutingInput): Promise<RoutingDecision> => {
  const { tenantId, siteId, requestType, assetTag, priority, category } = input;
  const rules = await RequestRoutingRule.find({ tenantId, ...(requestType ? { requestType } : {}) })
    .sort({ weight: -1, createdAt: 1 })
    .lean<RequestRoutingRuleDocument[]>();

  const match = rules.find((rule) => {
    if (siteId && rule.siteId && !rule.siteId.equals(siteId)) return false;
    if (rule.assetTag && rule.assetTag !== assetTag) return false;
    if (rule.priority && rule.priority !== priority) return false;
    if (rule.category && rule.category !== category) return false;
    return true;
  });

  if (!match) return undefined;

  return { ruleId: match._id, destination: match.destination };
};
