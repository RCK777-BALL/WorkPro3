/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import InventoryItem from '../models/InventoryItem';
import PartModel from '../src/modules/inventory/models/Part';

export interface PartUsageEntry {
  partId: Types.ObjectId;
  qty?: number | null | undefined;
  cost?: number | null | undefined;
}

export interface NormalizedPartUsage {
  parts: Array<PartUsageEntry & { qty: number; cost: number }>;
  partsCost: number;
}

export const normalizePartUsageCosts = async (
  tenantId: string,
  entries: PartUsageEntry[],
): Promise<NormalizedPartUsage> => {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const normalized = entries
    .filter((entry): entry is PartUsageEntry & { partId: Types.ObjectId } => Boolean(entry?.partId))
    .map((entry) => ({
      partId: entry.partId,
      qty: Number(entry.qty ?? 0) || 0,
      cost: entry.cost ?? undefined,
    }));

  const missingCostIds = Array.from(
    new Set(
      normalized
        .filter((entry) => entry.cost === undefined)
        .map((entry) => entry.partId.toString()),
    ),
  );

  const costMap = new Map<string, number>();
  if (missingCostIds.length) {
    const objectIds = missingCostIds.map((id) => new Types.ObjectId(id));
    const [parts, legacyItems] = await Promise.all([
      PartModel.find({ tenantId: tenantObjectId, _id: { $in: objectIds } })
        .select('unitCost cost')
        .lean(),
      InventoryItem.find({ tenantId: tenantObjectId, _id: { $in: objectIds } })
        .select('unitCost cost')
        .lean(),
    ]);

    parts.forEach((part) => {
      costMap.set(part._id.toString(), part.unitCost ?? part.cost ?? 0);
    });

    legacyItems.forEach((item) => {
      if (!costMap.has(item._id.toString())) {
        costMap.set(item._id.toString(), item.unitCost ?? item.cost ?? 0);
      }
    });
  }

  const withCosts = normalized.map((entry) => ({
    ...entry,
    cost: entry.cost ?? costMap.get(entry.partId.toString()) ?? 0,
  }));

  const partsCost = withCosts.reduce((sum, entry) => sum + entry.qty * (entry.cost ?? 0), 0);

  return { parts: withCosts, partsCost };
};

