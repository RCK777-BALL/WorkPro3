/*
 * SPDX-License-Identifier: MIT
 */

import cron from 'node-cron';
import { Types } from 'mongoose';

import PartModel, { type PartDocument } from '../modules/inventory/models/Part';
import PurchaseOrderModel from '../modules/inventory/models/PurchaseOrder';
import StockItemModel from '../modules/inventory/models/StockItem';
import ReorderSuggestionModel from '../modules/inventory/models/ReorderSuggestion';
import { determineReorderQuantity } from '../modules/inventory/service';
import logger from '../utils/logger';

const SOURCE_TYPE = 'low_stock_scan';
const ACTIVE_PO_STATUSES = ['pending', 'approved', 'ordered'];
const DEFAULT_CRON = process.env.REORDER_SUGGESTION_CRON || '30 * * * *';
const INCLUDE_ON_ORDER = process.env.REORDER_SUGGESTION_INCLUDE_OPEN_POS !== 'false';
const LEAD_TIME_BUFFER = Number(process.env.REORDER_SUGGESTION_LEAD_TIME_BUFFER ?? '0');

type PartForSuggestion = Pick<
  PartDocument,
  | '_id'
  | 'tenantId'
  | 'siteId'
  | 'quantity'
  | 'reorderPoint'
  | 'reorderQty'
  | 'minLevel'
  | 'leadTime'
  | 'minStock'
>;

interface ScanStatus {
  lastStartedAt?: Date;
  lastFinishedAt?: Date;
  lastRunId?: Types.ObjectId;
  lastProcessed?: number;
  lastError?: string;
  running: boolean;
}

const toKey = (partId: Types.ObjectId, siteId?: Types.ObjectId | null) =>
  `${partId.toString()}:${siteId?.toString() ?? 'na'}`;

const collectTenantIds = async (): Promise<Types.ObjectId[]> => {
  const ids = await PartModel.distinct('tenantId');
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id as Types.ObjectId));
};

const buildOpenPoMap = async (tenantId: Types.ObjectId): Promise<Map<string, number>> => {
  if (!INCLUDE_ON_ORDER) {
    return new Map();
  }

  const pipeline = [
    { $match: { tenantId, status: { $in: ACTIVE_PO_STATUSES } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: { part: '$items.part', siteId: '$siteId' },
        onOrder: {
          $sum: {
            $max: [
              {
                $subtract: ['$items.quantity', { $ifNull: ['$items.qtyReceived', 0] }],
              },
              0,
            ],
          },
        },
      },
    },
  ];

  const results = await PurchaseOrderModel.aggregate<{
    _id: { part: Types.ObjectId; siteId?: Types.ObjectId | null };
    onOrder: number;
  }>(pipeline);

  const map = new Map<string, number>();
  results.forEach((entry) => {
    map.set(toKey(entry._id.part, entry._id.siteId ?? undefined), entry.onOrder ?? 0);
  });
  return map;
};

const buildLocationMap = async (
  tenantId: Types.ObjectId,
  partIds: Types.ObjectId[],
): Promise<Map<string, Types.ObjectId>> => {
  const stockItems = await StockItemModel.find({
    tenantId,
    part: { $in: partIds },
  })
    .select('part location')
    .lean<{ _id: Types.ObjectId; part: Types.ObjectId; location: Types.ObjectId }[]>();

  const map = new Map<string, Types.ObjectId>();
  stockItems.forEach((item) => {
    const key = item.part.toString();
    if (!map.has(key)) {
      map.set(key, item.location);
    }
  });
  return map;
};

const buildSuggestionPayload = (
  part: PartForSuggestion,
  runId: Types.ObjectId,
  generatedAt: Date,
  onOrderMap: Map<string, number>,
  locationMap: Map<string, Types.ObjectId>,
) => {
  const thresholdField: 'minLevel' | 'reorderPoint' =
    typeof part.minLevel === 'number' && part.minLevel > 0 ? 'minLevel' : 'reorderPoint';
  const threshold = thresholdField === 'minLevel' ? part.minLevel ?? 0 : part.reorderPoint ?? 0;

  if (!threshold || threshold <= 0) {
    return null;
  }

  const onOrder =
    onOrderMap.get(toKey(part._id as Types.ObjectId, part.siteId)) ??
    onOrderMap.get(toKey(part._id as Types.ObjectId, null)) ??
    0;
  const effectiveThreshold =
    threshold + (part.leadTime && part.leadTime > 0 ? Math.max(0, LEAD_TIME_BUFFER) : 0);
  const effectiveQuantity = part.quantity + (INCLUDE_ON_ORDER ? onOrder : 0);

  if (effectiveQuantity > effectiveThreshold) {
    return null;
  }

  const suggestedQty = Math.max(determineReorderQuantity(part) - (INCLUDE_ON_ORDER ? onOrder : 0), 1);

  return {
    tenantId: part.tenantId,
    siteId: part.siteId,
    part: part._id as Types.ObjectId,
    targetLocation: locationMap.get((part._id as Types.ObjectId).toString()),
    suggestedQty,
    onHand: part.quantity,
    onOrder,
    threshold: effectiveThreshold,
    leadTimeDays: part.leadTime,
    source: {
      type: SOURCE_TYPE,
      runId,
      generatedAt,
      criteria: {
        thresholdField,
        includeOnOrder: INCLUDE_ON_ORDER,
        leadTimeBuffer: Math.max(0, LEAD_TIME_BUFFER),
      },
    },
    status: 'open' as const,
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };
};

const scanTenantSuggestions = async (
  tenantId: Types.ObjectId,
  runId: Types.ObjectId,
  generatedAt: Date,
): Promise<number> => {
  const parts = await PartModel.find({
    tenantId,
    $or: [{ reorderPoint: { $gt: 0 } }, { minLevel: { $gt: 0 } }],
  })
    .select('tenantId siteId quantity reorderPoint reorderQty minLevel leadTime minStock')
    .lean<PartForSuggestion[]>();

  if (!parts.length) {
    await ReorderSuggestionModel.deleteMany({ tenantId, 'source.type': SOURCE_TYPE });
    return 0;
  }

  const [onOrderMap, locationMap] = await Promise.all([
    buildOpenPoMap(tenantId),
    buildLocationMap(
      tenantId,
      parts.map((part) => part._id as Types.ObjectId),
    ),
  ]);

  let created = 0;

  await Promise.all(
    parts.map(async (part) => {
      const payload = buildSuggestionPayload(part, runId, generatedAt, onOrderMap, locationMap);
      if (!payload) return;
      await ReorderSuggestionModel.findOneAndUpdate(
        { tenantId, part: payload.part, 'source.type': SOURCE_TYPE },
        { $set: payload },
        { upsert: true },
      );
      created += 1;
    }),
  );

  await ReorderSuggestionModel.deleteMany({
    tenantId,
    'source.type': SOURCE_TYPE,
    'source.runId': { $ne: runId },
  });

  return created;
};

let scheduledJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;
let status: ScanStatus = { running: false };

export const getLowStockScanStatus = (): ScanStatus => ({ ...status });

export const runLowStockScan = async (): Promise<void> => {
  if (isRunning) {
    status = {
      ...status,
      lastFinishedAt: new Date(),
      lastError: 'Skipped overlapping run',
    };
    logger.warn('[Inventory] low stock scan skipped (previous run still active)');
    return;
  }

  const startedAt = new Date();
  const runId = new Types.ObjectId();
  isRunning = true;
  status = { running: true, lastStartedAt: startedAt, lastRunId: runId };

  try {
    const tenants = await collectTenantIds();
    let processed = 0;
    for (const tenantId of tenants) {
      processed += await scanTenantSuggestions(tenantId, runId, startedAt);
    }

    status = {
      running: false,
      lastStartedAt: startedAt,
      lastFinishedAt: new Date(),
      lastRunId: runId,
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

export const startLowStockScanner = (cronExpr = DEFAULT_CRON): void => {
  if (!cron.validate(cronExpr)) {
    logger.warn(`[Inventory] invalid cron expression "${cronExpr}". Reorder scan disabled.`);
    return;
  }

  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }

  scheduledJob = cron.schedule(cronExpr, () => {
    runLowStockScan().catch((err) => {
      logger.error('[Inventory] low stock scan failed', err);
    });
  });

  logger.info(`[Inventory] low stock scan scheduler started (${cronExpr}).`);
};

export const stopLowStockScanner = (): void => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
};
