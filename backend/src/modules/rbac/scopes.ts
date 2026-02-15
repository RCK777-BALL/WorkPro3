/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Site from '../../../models/Site';
import Plant from '../../../models/Plant';
import { toObjectId, type EntityIdLike } from '../../../utils/ids';

export interface RoleScopeInput {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike | null;
  departmentId?: EntityIdLike | null;
}

export const buildRoleScopeFilter = (tenantId: Types.ObjectId, siteId?: Types.ObjectId | null) => {
  const filter: Record<string, unknown> = { tenantId };

  if (siteId) {
    filter.$or = [{ siteId: { $exists: false } }, { siteId: null }, { siteId }];
  }

  return filter;
};

export const normalizeRoleScope = (input: RoleScopeInput) => {
  const tenantId = toObjectId(input.tenantId);
  const siteId = toObjectId(input.siteId) ?? null;
  const departmentId = toObjectId(input.departmentId) ?? null;
  return { tenantId, siteId, departmentId };
};

export const assertSiteScope = async (tenantId: Types.ObjectId, siteId?: Types.ObjectId | null) => {
  if (!siteId) return;
  const [siteExists, plantExists] = await Promise.all([
    Site.exists({ _id: siteId, tenantId }),
    Plant.exists({ _id: siteId, tenantId }),
  ]);
  if (!siteExists && !plantExists) {
    const error = new Error('Site does not belong to tenant');
    (error as { status?: number }).status = 403;
    throw error;
  }
};
