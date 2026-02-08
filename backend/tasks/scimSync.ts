/*
 * SPDX-License-Identifier: MIT
 */

import { scheduleJob } from 'node-schedule';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { isScimEnabled } from '../config/featureFlags';
import Tenant from '../models/Tenant';

const SYNC_CRON = process.env.SCIM_SYNC_CRON ?? '*/30 * * * *';
const TENANT_FILTER = process.env.SCIM_SYNC_TENANT_IDS ?? '';

export type ScimSyncHandler = (tenantId: Types.ObjectId) => Promise<void>;

const scimSyncHandlers: ScimSyncHandler[] = [];

export const registerScimSyncHandler = (handler: ScimSyncHandler): void => {
  scimSyncHandlers.push(handler);
};

const parseTenantFilter = (): Types.ObjectId[] => {
  if (!TENANT_FILTER.trim()) {
    return [];
  }

  return TENANT_FILTER.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => Types.ObjectId.isValid(entry))
    .map((entry) => new Types.ObjectId(entry));
};

const loadTenants = async (): Promise<Array<{ _id: Types.ObjectId; name: string }>> => {
  const filterIds = parseTenantFilter();
  const query = filterIds.length ? { _id: { $in: filterIds } } : { status: 'active' };
  return Tenant.find(query).select('_id name').lean().exec();
};

export const runScimSyncJob = async (): Promise<void> => {
  if (!scimSyncHandlers.length) {
    logger.info('[SCIM Sync] No handlers registered. Skipping sync run.');
    return;
  }

  const tenants = await loadTenants();
  if (!tenants.length) {
    logger.info('[SCIM Sync] No tenants found for SCIM sync.');
    return;
  }

  await Promise.all(
    tenants.map(async (tenant) => {
      await Promise.all(
        scimSyncHandlers.map(async (handler) => {
          const handlerName = handler.name || 'anonymous';
          try {
            await handler(tenant._id);
            logger.info(
              `[SCIM Sync] Completed handler "${handlerName}" for tenant ${tenant.name} (${tenant._id.toString()}).`,
            );
          } catch (err) {
            logger.error(
              `[SCIM Sync] Handler "${handlerName}" failed for tenant ${tenant.name} (${tenant._id.toString()}).`,
              err,
            );
          }
        }),
      );
    }),
  );
};

export const startScimSyncJob = (): void => {
  if (!isScimEnabled()) {
    logger.info('SCIM sync job skipped because SCIM is disabled');
    return;
  }

  scheduleJob('scim-sync', SYNC_CRON, async () => {
    logger.info('Running SCIM sync for all tenants');
    await runScimSyncJob();
  });
};

export default startScimSyncJob;
