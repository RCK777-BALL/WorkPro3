/*
 * SPDX-License-Identifier: MIT
 */

import { scheduleJob } from 'node-schedule';
import logger from '../utils/logger';
import { isScimEnabled } from '../config/featureFlags';

const SYNC_CRON = process.env.SCIM_SYNC_CRON ?? '*/30 * * * *';

export const startScimSyncJob = (): void => {
  if (!isScimEnabled()) {
    logger.info('SCIM sync job skipped because SCIM is disabled');
    return;
  }

  scheduleJob('scim-sync', SYNC_CRON, async () => {
    logger.info('Running SCIM sync for all tenants');
    // TODO: hydrate SCIM provisioning handlers per tenant
  });
};

export default startScimSyncJob;
