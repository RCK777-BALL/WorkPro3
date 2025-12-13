/*
 * SPDX-License-Identifier: MIT
 */

import cron from 'node-cron';
import { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import logger from '../utils/logger';
import { runWarehouseAggregation } from '../src/modules/analytics/service';
import { upsertMetricsRollups } from '../src/modules/analytics/rollups';

const DEFAULT_CRON = process.env.ANALYTICS_WAREHOUSE_CRON || '30 1 * * *';

const distinctTenantIds = async (): Promise<Types.ObjectId[]> => {
  const ids = await WorkOrder.distinct('tenantId');
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id as Types.ObjectId));
};

const determineRange = () => {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  return { start, end };
};

export const runAnalyticsWarehouseJob = async (): Promise<void> => {
  const tenants = await distinctTenantIds();
  if (!tenants.length) {
    logger.info('[Analytics Warehouse] no tenants found for aggregation');
    return;
  }

  const { start, end } = determineRange();
  await Promise.all(
    tenants.map(async (tenantId) => {
      try {
        await runWarehouseAggregation(tenantId, 'day', start, end);
        await runWarehouseAggregation(tenantId, 'month', start, end);
        await upsertMetricsRollups(tenantId, 'day', start, end);
        await upsertMetricsRollups(tenantId, 'month', start, end);
        logger.info(`[Analytics Warehouse] aggregated metrics for tenant ${tenantId.toString()}`);
      } catch (err) {
        logger.error(`[Analytics Warehouse] failed aggregation for tenant ${tenantId.toString()}`, err);
      }
    }),
  );
};

let scheduledJob: ReturnType<typeof cron.schedule> | null = null;

export const startAnalyticsWarehouseScheduler = (cronExpr = DEFAULT_CRON): void => {
  if (!cron.validate(cronExpr)) {
    logger.warn(`[Analytics Warehouse] invalid cron expression "${cronExpr}". Scheduler disabled.`);
    return;
  }

  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }

  scheduledJob = cron.schedule(cronExpr, () => {
    runAnalyticsWarehouseJob().catch((err) => {
      logger.error('[Analytics Warehouse] scheduled run failed', err);
    });
  });

  logger.info(`[Analytics Warehouse] scheduler started (${cronExpr}).`);
};

export const stopAnalyticsWarehouseScheduler = (): void => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
};
