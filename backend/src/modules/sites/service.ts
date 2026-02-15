/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type Document } from 'mongoose';
import Site, { type SiteDocument } from '../../../models/Site';

export interface SiteContext {
  tenantId: string;
}

export interface SiteInput {
  name: string;
  description?: string;
}

type LeanDocument<T> = T extends Document ? Omit<T, keyof Document> : T;
type SiteListResult = Awaited<ReturnType<typeof Site.find>>;

const toObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

export const listSites = async (context: SiteContext): Promise<SiteListResult> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) return [];
  return Site.find({ tenantId }).sort({ name: 1 });
};

export const createSite = async (context: SiteContext, input: SiteInput): Promise<SiteDocument> => {
  const tenantId = toObjectId(context.tenantId);
  if (!tenantId) throw new Error('Tenant context required');
  return Site.create({ tenantId, name: input.name });
};
