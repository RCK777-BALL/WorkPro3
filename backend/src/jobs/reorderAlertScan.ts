/*
 * SPDX-License-Identifier: MIT
 */

import cron from 'node-cron';
import { Types, type FilterQuery } from 'mongoose';

import PartModel, { type PartDocument } from '../modules/inventory/models/Part';
import StockItemModel, { type StockItemDocument } from '../modules/inventory/models/StockItem';
import StockLevelModel from '../modules/inventory/models/StockLevel';
import ReorderAlertModel, {
  type ReorderAlertDocument,
  type ReorderAlertStatus,
} from '../modules/inventory/models/ReorderAlert';
import { createNotification } from '../../services/notificationService';
import logger from '../../utils/logger';

const DEFAULT_CRON = process.env.REORDER_ALERT_CRON || '*/20 * * * *';
const NOTIFICATIONS_ENABLED = process.env.REORDER_ALERT_NOTIFICATIONS === 'true';

interface ScanStatus {
  lastStartedAt?: Date;
  lastFinishedAt?: Date;
  lastError?: string;
  lastProcessed?: number;
  running: boolean;
}

const toKey = (partId: Types.ObjectId, location?: Types.ObjectId | null) =>
  `${partId.toString()}:${location?.toString() ?? 'na'}`;

const collectTenantIds = async (): Promise<Types.ObjectId[]> => {
  const ids = await PartModel.distinct('tenantId');
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id as Types.ObjectId));
};

const loadOverrides = async (
  tenantId: Types.ObjectId,
  partIds: Types.ObjectId[],
): Promise<Map<string, number>> => {
  const overrides = await StockLevelModel.find({ tenantId, part: { $in: partIds } })
    .select('part bin reorder_point')
    .lean<{ part: Types.ObjectId; bin: Types.ObjectId; reorder_point: number }[]>();

  const map = new Map<string, number>();
  overrides.forEach((entry) => {
    if (entry.reorder_point && entry.reorder_point > 0) {
      map.set(toKey(entry.part, entry.bin), entry.reorder_point);
    }
  });
  return map;
};

const resolveThreshold = (
  part: Pick<PartDocument, 'reorderPoint' | 'minLevel'>,
  override?: number,
): number => {
  if (override && override > 0) return override;
  if (part.minLevel && part.minLevel > 0) return part.minLevel;
  return part.reorderPoint ?? 0;
};

const upsertAlert = async (
  payload: {
    tenantId: Types.ObjectId;
    siteId?: Types.ObjectId;
    part: Types.ObjectId;
    stockItem?: Types.ObjectId;
    location?: Types.ObjectId;
    quantity: number;
    threshold: number;
    triggeredAt: Date;
    source?: ReorderAlertDocument['source'];
  },
  existingMap: Map<string, Types.ObjectId>,
): Promise<{ id: Types.ObjectId; status: ReorderAlertStatus; wasExisting: boolean }> => {
  const key = toKey(payload.part, payload.location);
  const query: FilterQuery<ReorderAlertDocument> = {
    tenantId: payload.tenantId,
    part: payload.part,
    status: 'open',
  };

  if (payload.location) {
    query.location = payload.location;
  } else {
    query.location = { $exists: false } as any;
  }

  const existing = await ReorderAlertModel.findOne(query);
  if (existing) {
    existingMap.delete(key);
    existing.set({
      quantity: payload.quantity,
      threshold: payload.threshold,
      siteId: payload.siteId ?? existing.siteId,
      stockItem: payload.stockItem ?? existing.stockItem,
      location: payload.location ?? existing.location,
      lastSeenAt: payload.triggeredAt,
      source: payload.source ?? existing.source,
    });
    await existing.save();
    return { id: existing._id as Types.ObjectId, status: existing.status, wasExisting: true };
  }

  const created = await ReorderAlertModel.create({
    ...payload,
    status: 'open',
    lastSeenAt: payload.triggeredAt,
  });
  return { id: created._id as Types.ObjectId, status: created.status, wasExisting: false };
};

const notifyIfEnabled = async (
  part: Pick<PartDocument, 'name'>,
  tenantId: Types.ObjectId,
  stockItemId?: Types.ObjectId,
) => {
  if (!NOTIFICATIONS_ENABLED) return;

  try {
    await createNotification({
      tenantId,
      inventoryItemId: stockItemId,
      title: 'Reorder alert triggered',
      message: `${part.name} is at or below its reorder point.`,
      category: 'overdue',
      type: 'warning',
      event: 'inventory_reorder_alert',
    });
  } catch (err) {
    logger.warn('[Inventory] Failed to create reorder alert notification', err);
  }
};

const scanTenantAlerts = async (
  tenantId: Types.ObjectId,
  runStartedAt: Date,
): Promise<number> => {
  const parts = await PartModel.find({ tenantId })
    .select('tenantId siteId name quantity reorderPoint minLevel vendor assetIds pmTemplateIds lastAlertAt')
    .lean<PartDocument[]>();
  if (!parts.length) {
    await ReorderAlertModel.deleteMany({ tenantId });
    return 0;
  }

  const partIds = parts.map((part) => part._id as Types.ObjectId);
  const [stockItems, overrideMap, openAlerts] = await Promise.all([
    StockItemModel.find({ tenantId, part: { $in: partIds } })
      .select('part location quantity siteId')
      .lean<StockItemDocument[]>(),
    loadOverrides(tenantId, partIds),
    ReorderAlertModel.find({ tenantId, status: 'open' })
      .select('_id part location')
      .lean<{ _id: Types.ObjectId; part: Types.ObjectId; location?: Types.ObjectId }[]>(),
  ]);

  const openMap = new Map<string, Types.ObjectId>(
    openAlerts.map((alert) => [toKey(alert.part, alert.location), alert._id as Types.ObjectId]),
  );

  const partMap = new Map(parts.map((part) => [part._id.toString(), part]));
  const triggeredParts = new Set<string>();
  let processed = 0;

  for (const stockItem of stockItems) {
    const part = partMap.get(stockItem.part.toString());
    if (!part) continue;
    const threshold = resolveThreshold(part, overrideMap.get(toKey(stockItem.part as Types.ObjectId, stockItem.location)));
    if (!threshold || stockItem.quantity > threshold) continue;

    const result = await upsertAlert(
      {
        tenantId,
        siteId: stockItem.siteId ?? (part.siteId as Types.ObjectId | undefined),
        part: stockItem.part as Types.ObjectId,
        stockItem: stockItem._id as Types.ObjectId,
        location: stockItem.location as Types.ObjectId,
        quantity: stockItem.quantity,
        threshold,
        triggeredAt: runStartedAt,
        source: { type: 'stock_scan' },
      },
      openMap,
    );

    triggeredParts.add(part._id.toString());

    if (!result.wasExisting) {
      processed += 1;
      await notifyIfEnabled(part, tenantId, stockItem._id as Types.ObjectId);
    }
  }

  for (const part of parts) {
    if (triggeredParts.has(part._id.toString())) continue;
    const threshold = resolveThreshold(part, undefined);
    if (!threshold || part.quantity > threshold) continue;

    const result = await upsertAlert(
      {
        tenantId,
        siteId: part.siteId as Types.ObjectId | undefined,
        part: part._id as Types.ObjectId,
        quantity: part.quantity,
        threshold,
        triggeredAt: runStartedAt,
        source: { type: 'stock_scan' },
      },
      openMap,
    );

    if (!result.wasExisting) {
      processed += 1;
      await notifyIfEnabled(part, tenantId);
    }
  }

  if (openMap.size) {
    await ReorderAlertModel.updateMany(
      { _id: { $in: Array.from(openMap.values()) } },
      { $set: { status: 'resolved', resolvedAt: runStartedAt, lastSeenAt: runStartedAt } },
    );
  }

  return processed;
};

let scheduledJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;
let status: ScanStatus = { running: false };

export const getReorderAlertScanStatus = (): ScanStatus => ({ ...status });

export const runReorderAlertScan = async (): Promise<void> => {
  if (isRunning) {
    status = { ...status, lastFinishedAt: new Date(), lastError: 'Skipped overlapping run' };
    logger.warn('[Inventory] reorder alert scan skipped (previous run still active)');
    return;
  }

  const startedAt = new Date();
  isRunning = true;
  status = { running: true, lastStartedAt: startedAt };

  try {
    const tenants = await collectTenantIds();
    let processed = 0;
    for (const tenantId of tenants) {
      processed += await scanTenantAlerts(tenantId, startedAt);
    }

    status = {
      running: false,
      lastStartedAt: startedAt,
      lastFinishedAt: new Date(),
      lastProcessed: processed,
    };
  } catch (err) {
    status = {
      ...status,
      running: false,
      lastFinishedAt: new Date(),
      lastError: err instanceof Error ? err.message : 'Unknown error',
    };
    throw err;
  } finally {
    isRunning = false;
  }
};

export const startReorderAlertScanner = (cronExpr = DEFAULT_CRON): void => {
  if (!cron.validate(cronExpr)) {
    logger.warn(`[Inventory] invalid cron expression "${cronExpr}". Reorder alert scan disabled.`);
    return;
  }

  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }

  scheduledJob = cron.schedule(cronExpr, () => {
    runReorderAlertScan().catch((err) => {
      logger.error('[Inventory] reorder alert scan failed', err);
    });
  });

  logger.info(`[Inventory] reorder alert scanner started (${cronExpr}).`);
};

export const stopReorderAlertScanner = (): void => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
};
