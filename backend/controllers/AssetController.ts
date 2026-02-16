/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from '../types/http';
import type { ParsedQs } from 'qs';
import mongoose, { Error as MongooseError, FlattenMaps, Types } from 'mongoose';
import Asset, { type AssetDoc } from '../models/Asset';
import WorkHistory, { type WorkHistoryDocument } from '../models/WorkHistory';
import DowntimeLog from '../models/DowntimeLog';
import WorkOrderModel, { type WorkOrder } from '../models/WorkOrder';
import Site from '../models/Site';
import Department from '../models/Department';
import Line from '../models/Line';
import Station, { type StationDoc } from '../models/Station';
import { validationResult, ValidationError } from 'express-validator';
import type { ParamsDictionary } from 'express-serve-static-core';
import { ensureQrCode, generateQrCodeValue } from '../services/qrCode';
import { logger, filterFields, auditAction, toEntityId, toObjectId, sendResponse } from '../utils';

type AssetParams = ParamsDictionary & { id: string };
type AssetBody = Record<string, unknown> & { name?: string };
type AssetUpdateBody = Record<string, unknown>;
type SearchAssetsQuery = ParsedQs & { q?: string };

type LeanWorkHistory = FlattenMaps<WorkHistoryDocument>;
type LeanWorkOrderReliability = FlattenMaps<WorkOrderReliability>;

const assetCreateFields = [
  'name',
  'type',
  'location',
  'notes',
  'departmentId',
  'department',
  'status',
  'serialNumber',
  'description',
  'modelName',
  'manufacturer',
  'purchaseDate',
  'warrantyStart',
  'warrantyEnd',
  'purchaseCost',
  'expectedLifeMonths',
  'replacementDate',
  'installationDate',
  'line',
  'lineId',
  'station',
  'stationId',
  'siteId',
  'criticality',
  'documents',
  'customFields',
];

const assetUpdateFields = [...assetCreateFields];

type MaybeObjectId = string | Types.ObjectId | undefined | null;

interface AssetHierarchyLocation {
  departmentId?: MaybeObjectId;
  lineId?: MaybeObjectId;
  stationId?: MaybeObjectId;
}

interface HierarchyContext extends AssetHierarchyLocation {
  tenantId?: MaybeObjectId;
  assetId: MaybeObjectId;
}

const normalizeId = (value?: MaybeObjectId): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string') return toObjectId(value);
  return undefined;
};

type WorkOrderReliability = Pick<WorkOrder, 'assetId' | 'createdAt' | 'completedAt' | 'timeSpentMin'>;

const calculateMttrFromOrders = (orders: WorkOrderReliability[]): number => {
  const completed = orders.filter((order) => order.completedAt);
  if (!completed.length) return 0;

  const totalHours = completed.reduce((sum, order) => {
    const end = order.completedAt?.getTime() ?? 0;
    const start = order.createdAt?.getTime() ?? end;
    const durationHours =
      typeof order.timeSpentMin === 'number' && order.timeSpentMin > 0
        ? order.timeSpentMin / 60
        : Math.max(end - start, 0) / 36e5;
    return sum + durationHours;
  }, 0);

  return totalHours / completed.length;
};

const calculateMtbfFromOrders = (orders: WorkOrderReliability[]): number => {
  const failures = [...orders]
    .filter((order) => order.completedAt)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
  if (failures.length < 2) return 0;
  let total = 0;
  for (let idx = 1; idx < failures.length; idx += 1) {
    total += (failures[idx].completedAt?.getTime() ?? 0) - (failures[idx - 1].completedAt?.getTime() ?? 0);
  }
  return total / (failures.length - 1) / 36e5;
};

const calculateReliabilityFromHistory = (
  history: LeanWorkHistory[],
): { mttrHours: number; mtbfHours: number } => {
  const completed = history.filter((entry) => entry.completedAt);
  if (!completed.length) {
    return { mtbfHours: 0, mttrHours: 0 };
  }

  const mttrHours = (() => {
    const durations = completed
      .map((entry) => entry.timeSpentHours)
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    if (!durations.length) return 0;
    const total = durations.reduce((sum, value) => sum + value, 0);
    return total / durations.length;
  })();

  const mtbfHours = (() => {
    const failures = [...completed].sort(
      (a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    );
    if (failures.length < 2) return 0;
    let delta = 0;
    for (let idx = 1; idx < failures.length; idx += 1) {
      delta += (failures[idx].completedAt?.getTime() ?? 0) - (failures[idx - 1].completedAt?.getTime() ?? 0);
    }
    return delta / (failures.length - 1) / 36e5;
  })();

  return { mtbfHours, mttrHours };
};

const buildReliabilitySummary = (
  history: LeanWorkHistory[],
  orders: LeanWorkOrderReliability[],
): { mttrHours: number; mtbfHours: number } => {
  const historyMetrics = calculateReliabilityFromHistory(history);
  const mttrHours = historyMetrics.mttrHours || calculateMttrFromOrders(orders);
  const mtbfHours = historyMetrics.mtbfHours || calculateMtbfFromOrders(orders);
  return { mttrHours, mtbfHours };
};

const collectAssetReliability = async (
  tenantId: string,
  assetIds: Types.ObjectId[],
): Promise<Map<string, { mttrHours: number; mtbfHours: number; downtimeCount: number }>> => {
  if (!assetIds.length) return new Map();

  const [historyRaw, ordersRaw, downtimeLogs]: [
    LeanWorkHistory[],
    LeanWorkOrderReliability[],
    Array<{ assetId?: Types.ObjectId }>,
  ] = await Promise.all([
    WorkHistory.find({ tenantId, asset: { $in: assetIds } })
      .select('asset completedAt timeSpentHours')
      .lean<LeanWorkHistory[]>(),
    WorkOrderModel.find({ tenantId, assetId: { $in: assetIds } })
      .select('assetId createdAt completedAt timeSpentMin')
      .lean<LeanWorkOrderReliability[]>(),
    DowntimeLog.find({ tenantId, assetId: { $in: assetIds } })
      .select('assetId')
      .lean<Array<{ assetId?: Types.ObjectId }>>(),
  ]);

  const historyByAsset = new Map<string, LeanWorkHistory[]>();
  historyRaw.forEach((entry: LeanWorkHistory) => {
    const key = entry.asset?.toString();
    if (!key) return;
    const list = historyByAsset.get(key) ?? [];
    list.push(entry);
    historyByAsset.set(key, list);
  });

  const ordersByAsset = new Map<string, LeanWorkOrderReliability[]>();
  ordersRaw.forEach((order: LeanWorkOrderReliability) => {
    const key = order.assetId?.toString();
    if (!key) return;
    const list = ordersByAsset.get(key) ?? [];
    list.push(order);
    ordersByAsset.set(key, list);
  });

  const downtimeCounts = new Map<string, number>();
  downtimeLogs.forEach((log: { assetId?: Types.ObjectId }) => {
    const key = log.assetId?.toString();
    if (!key) return;
    downtimeCounts.set(key, (downtimeCounts.get(key) ?? 0) + 1);
  });

  const metrics = new Map<string, { mttrHours: number; mtbfHours: number; downtimeCount: number }>();
  assetIds.forEach((assetId) => {
    const id = assetId.toString();
    const reliability = buildReliabilitySummary(historyByAsset.get(id) ?? [], ordersByAsset.get(id) ?? []);
    metrics.set(id, { ...reliability, downtimeCount: downtimeCounts.get(id) ?? 0 });
  });

  return metrics;
};

type AssetLike = Record<string, unknown>;
const isAssetLike = (value: AssetLike | null): value is AssetLike => value !== null;

const toAssetResponse = (asset: unknown): AssetLike | null => {
  if (!asset || typeof asset !== 'object') return null;

  const base: AssetLike =
    typeof (asset as AssetDoc)?.toObject === 'function'
      ? ((asset as AssetDoc).toObject() as AssetLike)
      : { ...(asset as AssetLike) };

  const response: AssetLike = { ...base };

  const rawId = response._id as unknown;
  const stringId =
    rawId instanceof Types.ObjectId
      ? rawId.toString()
      : typeof rawId === 'string' && rawId.trim().length > 0
        ? rawId
        : undefined;

  if (stringId) {
    response._id = stringId;
    if (typeof response.id !== 'string' || response.id.trim().length === 0) {
      response.id = stringId;
    }
  }

  const rawTenant = response.tenantId as unknown;
  if (rawTenant instanceof Types.ObjectId) {
    response.tenantId = rawTenant.toString();
  }

  ensureQrCode(response as { _id?: MaybeObjectId; tenantId?: MaybeObjectId; qrCode?: string }, 'asset');

  return response;
};

const addAssetToHierarchy = async ({
  tenantId,
  departmentId,
  lineId,
  stationId,
  assetId,
}: HierarchyContext) => {
  const tenantObjectId = normalizeId(tenantId);
  const departmentObjectId = normalizeId(departmentId);
  const lineObjectId = normalizeId(lineId);
  const stationObjectId = normalizeId(stationId);
  const assetObjectId = normalizeId(assetId);

  if (
    !tenantObjectId ||
    !departmentObjectId ||
    !lineObjectId ||
    !stationObjectId ||
    !assetObjectId
  ) {
    return;
  }

  const department = await Department.findOne({
    _id: departmentObjectId,
    tenantId: tenantObjectId,
  });

  if (!department) return;

  const line = department.lines.id(lineObjectId);
  if (!line) return;

  const station = line.stations.id(stationObjectId);
  if (!station) return;

  const alreadyLinked = station.assets.some((existing) =>
    existing.equals(assetObjectId),
  );

  if (!alreadyLinked) {
    station.assets.push(assetObjectId);
    await department.save();
  }
};

const removeAssetFromHierarchy = async ({
  tenantId,
  departmentId,
  lineId,
  stationId,
  assetId,
}: HierarchyContext) => {
  const tenantObjectId = normalizeId(tenantId);
  const departmentObjectId = normalizeId(departmentId);
  const lineObjectId = normalizeId(lineId);
  const stationObjectId = normalizeId(stationId);
  const assetObjectId = normalizeId(assetId);

  if (
    !tenantObjectId ||
    !departmentObjectId ||
    !lineObjectId ||
    !stationObjectId ||
    !assetObjectId
  ) {
    return;
  }

  const department = await Department.findOne({
    _id: departmentObjectId,
    tenantId: tenantObjectId,
  });

  if (!department) return;

  const line = department.lines.id(lineObjectId);
  if (!line) return;

  const station = line.stations.id(stationObjectId);
  if (!station) return;

  const index = station.assets.findIndex((existing) =>
    existing.equals(assetObjectId),
  );

  if (index !== -1) {
    station.assets.splice(index, 1);
    await department.save();
  }
};

const locationKey = ({ departmentId, lineId, stationId }: AssetHierarchyLocation) => {
  const department = departmentId instanceof Types.ObjectId ? departmentId.toString() : departmentId;
  const line = lineId instanceof Types.ObjectId ? lineId.toString() : lineId;
  const station = stationId instanceof Types.ObjectId ? stationId.toString() : stationId;

  if (!department || !line || !station) return undefined;
  return `${department}::${line}::${station}`;
};

async function getAllAssets(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    const plantId = req.plantId ?? req.siteId;
    if (plantId) filter.plant = plantId;
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter).lean();
    const assetIds = assets
      .map((asset) => {
        if (asset._id instanceof Types.ObjectId) return asset._id;
        if (typeof asset._id === 'string') return toObjectId(asset._id);
        return undefined;
      })
      .filter((id): id is Types.ObjectId => id instanceof Types.ObjectId);
    const reliabilityMap = req.tenantId ? await collectAssetReliability(req.tenantId, assetIds) : new Map();

    const payload = assets
      .map((asset) => {
        const response = toAssetResponse(asset);
        if (!response) return null;

        const assetId = typeof response.id === 'string' ? response.id : response._id;
        const metrics = typeof assetId === 'string' ? reliabilityMap.get(assetId) : undefined;
        if (metrics) {
          response.reliability = { mttrHours: metrics.mttrHours, mtbfHours: metrics.mtbfHours };
          response.downtimeCount = metrics.downtimeCount;
        }

        return response;
      })
      .filter(isAssetLike);
    sendResponse(res, payload);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function getAssetById(
  req: AuthedRequest<AssetParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      sendResponse(res, null, 'ID is required', 400);
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const filter: any = { _id: id, tenantId: req.tenantId };
    const plantId = req.plantId ?? req.siteId;
    if (plantId) filter.plant = plantId;
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, toAssetResponse(asset));
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function createAsset(
  req: AuthedRequest<ParamsDictionary, unknown, AssetBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {

  logger.debug('createAsset body:', req.body);
  logger.debug('createAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset');
  }

  const tenantId = req.tenantId;
  if (!tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return;
  }

  const plantId = req.plantId ?? req.siteId;
  if (!plantId) {
    sendResponse(res, null, 'Active plant context required', 400);
    return;
  }

  if (!req.body.name) {
    sendResponse(res, null, 'name is required', 400);
    return;
  }

  try {
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      sendResponse(res, null, errors.array() as ValidationError[], 400);
      return;
    }

    const payload: Record<string, unknown> = filterFields(
      req.body,
      assetCreateFields,
    );
    let stationForAsset: StationDoc | null = null;
    if (payload.stationId) {
      const stationId = payload.stationId as string;
      if (!mongoose.Types.ObjectId.isValid(stationId)) {
        sendResponse(res, null, 'Invalid stationId', 400);
        return;
      }
      stationForAsset = await Station.findOne({ _id: stationId, tenantId, plant: plantId });
      if (!stationForAsset) {
        sendResponse(res, null, 'Station not found', 400);
        return;
      }
      payload.stationId = stationForAsset._id;
      payload.lineId = stationForAsset.lineId;
      payload.departmentId = stationForAsset.departmentId;
    } else if (payload.lineId) {
      const lineId = payload.lineId as string;
      if (!mongoose.Types.ObjectId.isValid(lineId)) {
        sendResponse(res, null, 'Invalid lineId', 400);
        return;
      }
      const lineDoc = await Line.findOne({ _id: lineId, tenantId, plant: plantId });
      if (!lineDoc) {
        sendResponse(res, null, 'Line not found', 400);
        return;
      }
      payload.lineId = lineDoc._id;
      payload.departmentId = lineDoc.departmentId;
    } else if (payload.departmentId) {
      const departmentId = payload.departmentId as string;
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        sendResponse(res, null, 'Invalid departmentId', 400);
        return;
      }
      const departmentDoc = await Department.findOne({ _id: departmentId, tenantId, plant: plantId });
      if (!departmentDoc) {
        sendResponse(res, null, 'Department not found for plant', 400);
        return;
      }
      payload.departmentId = departmentDoc._id;
    }
    payload.tenantId = tenantId;
    payload.plant = plantId;
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;

    const newAsset = await Asset.create(payload);
    ensureQrCode(newAsset, 'asset');
    if (!newAsset.qrCode) {
      newAsset.qrCode = generateQrCodeValue({ type: 'asset', id: newAsset._id.toString(), tenantId: tenantId.toString() });
    }
    if (newAsset.isModified('qrCode')) {
      await newAsset.save();
    }
    await addAssetToHierarchy({
      tenantId,
      departmentId: newAsset.departmentId as MaybeObjectId,
      lineId: newAsset.lineId as MaybeObjectId,
      stationId: newAsset.stationId as MaybeObjectId,
      assetId: newAsset._id,
    });
    const assetObj = newAsset.toObject();
    const response = toAssetResponse(assetObj);
    if (!response) {
      sendResponse(res, null, 'Failed to create asset', 500);
      return;
    }
    if (stationForAsset) {
      await Department.updateOne(
        { _id: stationForAsset.departmentId, tenantId },
        {
          $addToSet: {
            'lines.$[line].stations.$[station].assets': newAsset._id,
          },
        },
        {
          arrayFilters: [
            { 'line._id': stationForAsset.lineId },
            { 'station._id': stationForAsset._id },
          ],
        },
      );
    }
    await auditAction(req as any, 'create', 'Asset', toEntityId(newAsset._id as Types.ObjectId) ?? newAsset._id, undefined, assetObj);
    sendResponse(res, response, null, 201);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function updateAsset(
  req: AuthedRequest<AssetParams, unknown, AssetUpdateBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {

  logger.debug('updateAsset body:', req.body);
  logger.debug('updateAsset files:', (req as any).files);

  const files = (req as any).files as
    | Array<{ originalname?: string; mimetype?: string; size?: number }>
    | undefined;
  if (!files || files.length === 0) {
    logger.debug('No files uploaded for asset update');
  }

  const tenantId = req.tenantId;
  if (!tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return;
  }

  const plantId = req.plantId ?? req.siteId;
  if (!plantId) {
    sendResponse(res, null, 'Active plant context required', 400);
    return;
  }

  try {
    const id = req.params.id;
    if (!id) {
      sendResponse(res, null, 'ID is required', 400);
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const errors = validationResult(req as any);

    if (!errors.isEmpty()) {
      sendResponse(res, null, errors.array() as ValidationError[], 400);
      return;
    }

    const filter: Record<string, unknown> = { _id: id, tenantId, plant: plantId };
    if (req.siteId) filter.siteId = req.siteId;
    const update = filterFields(req.body, assetUpdateFields);
    let stationForAsset: StationDoc | null = null;
    if (update.stationId) {
      const stationId = update.stationId as string;
      if (!mongoose.Types.ObjectId.isValid(stationId)) {
        sendResponse(res, null, 'Invalid stationId', 400);
        return;
      }
      stationForAsset = await Station.findOne({ _id: stationId, tenantId, plant: plantId });
      if (!stationForAsset) {
        sendResponse(res, null, 'Station not found', 400);
        return;
      }
      update.stationId = stationForAsset._id;
      update.lineId = stationForAsset.lineId;
      update.departmentId = stationForAsset.departmentId;
    } else if (update.lineId) {
      const lineId = update.lineId as string;
      if (!mongoose.Types.ObjectId.isValid(lineId)) {
        sendResponse(res, null, 'Invalid lineId', 400);
        return;
      }
      const lineDoc = await Line.findOne({ _id: lineId, tenantId, plant: plantId });
      if (!lineDoc) {
        sendResponse(res, null, 'Line not found', 400);
        return;
      }
      update.lineId = lineDoc._id;
      update.departmentId = lineDoc.departmentId;
    } else if (update.departmentId) {
      const departmentId = update.departmentId as string;
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        sendResponse(res, null, 'Invalid departmentId', 400);
        return;
      }
      const departmentDoc = await Department.findOne({ _id: departmentId, tenantId, plant: plantId });
      if (!departmentDoc) {
        sendResponse(res, null, 'Department not found for plant', 400);
        return;
      }
      update.departmentId = departmentDoc._id;
    }
    const existing = await Asset.findOne(filter);
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    update.qrCode = generateQrCodeValue({ type: 'asset', id, tenantId: tenantId.toString() });
    update.plant = plantId;
    const asset = await Asset.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
      runValidators: true,
    });
    const previousLocation: AssetHierarchyLocation = {
      departmentId: existing.departmentId as MaybeObjectId,
      lineId: existing.lineId as MaybeObjectId,
      stationId: existing.stationId as MaybeObjectId,
    };
    const updatedLocation: AssetHierarchyLocation = {
      departmentId: asset?.departmentId as MaybeObjectId,
      lineId: asset?.lineId as MaybeObjectId,
      stationId: asset?.stationId as MaybeObjectId,
    };
    const previousKey = locationKey(previousLocation);
    const nextKey = locationKey(updatedLocation);

    if (previousKey && previousKey !== nextKey) {
      await removeAssetFromHierarchy({
        tenantId,
        departmentId: previousLocation.departmentId,
        lineId: previousLocation.lineId,
        stationId: previousLocation.stationId,
        assetId: existing._id,
      });
    }

    if (nextKey) {
      await addAssetToHierarchy({
        tenantId,
        departmentId: updatedLocation.departmentId,
        lineId: updatedLocation.lineId,
        stationId: updatedLocation.stationId,
        assetId: (asset?._id ?? existing._id) as MaybeObjectId,
      });
    }
    await auditAction(
      req as any,
      'update',
      'Asset',
      toEntityId(new Types.ObjectId(id)) ?? id,
      existing.toObject(),
      asset?.toObject(),
    );
    if (asset && stationForAsset) {
      if (
        existing.stationId &&
        !existing.stationId.equals(stationForAsset._id)
      ) {
        await Department.updateOne(
          { _id: existing.departmentId, tenantId },
          {
            $pull: {
              'lines.$[line].stations.$[station].assets': existing._id,
            },
          },
          {
            arrayFilters: [
              { 'line._id': existing.lineId },
              { 'station._id': existing.stationId },
            ],
          },
        );
      }
      await Department.updateOne(
        { _id: stationForAsset.departmentId, tenantId },
        {
          $addToSet: {
            'lines.$[line].stations.$[station].assets': asset._id,
          },
        },
        {
          arrayFilters: [
            { 'line._id': stationForAsset.lineId },
            { 'station._id': stationForAsset._id },
          ],
        },
      );
    }

    sendResponse(res, asset ? toAssetResponse(asset) : null);
    return;

  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function deleteAsset(
  req: AuthedRequest<AssetParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const id = req.params.id;
    if (!id) {
      sendResponse(res, null, 'ID is required', 400);
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const plantId = req.plantId ?? req.siteId;
    const filter: Record<string, unknown> = { _id: id, tenantId };
    if (plantId) filter.plant = plantId;
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOneAndDelete(filter);
    if (!asset) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await removeAssetFromHierarchy({
      tenantId,
      departmentId: asset.departmentId as MaybeObjectId,
      lineId: asset.lineId as MaybeObjectId,
      stationId: asset.stationId as MaybeObjectId,
      assetId: asset._id,
    });
    await auditAction(
      req as any,
      'delete',
      'Asset',
      toEntityId(new Types.ObjectId(id)) ?? id,
      asset.toObject(),
      undefined,
    );
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function searchAssets(
  req: AuthedRequest<ParamsDictionary, unknown, unknown, SearchAssetsQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const qValue = req.query.q;
    const q = typeof qValue === 'string' ? qValue : '';
    const regex = new RegExp(q, 'i');

    const filter: Record<string, unknown> = {
      tenantId: req.tenantId,
      $or: [
        { name: { $regex: regex } },
        { location: { $regex: regex } },
      ],
    };
    const plantId = req.plantId ?? req.siteId;
    if (plantId) filter.plant = plantId;
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter).limit(10).lean();
    const payload = assets.map((asset) => toAssetResponse(asset)).filter(isAssetLike);
    sendResponse(res, payload);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function getAssetTree(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plantId = req.plantId ?? req.siteId;
    const match: Record<string, unknown> = { tenantId: req.tenantId };
    if (plantId) match.plant = plantId;
    if (req.siteId) match.siteId = req.siteId;

    const assets = await Asset.find(match).lean();

    const siteIds = new Set<string>();
    const deptIds = new Set<string>();
    const lineIds = new Set<string>();
    const stationIds = new Set<string>();

    assets.forEach((a: any) => {
      if (a.siteId) siteIds.add(a.siteId.toString());
      if (a.departmentId) deptIds.add(a.departmentId.toString());
      if (a.lineId) lineIds.add(a.lineId.toString());
      if (a.stationId) stationIds.add(a.stationId.toString());
    });

    const [sites, departments, lines, stations] = await Promise.all([
      Site.find({ _id: { $in: Array.from(siteIds) } }).lean(),
      Department.find({ _id: { $in: Array.from(deptIds) } }).lean(),
      Line.find({ _id: { $in: Array.from(lineIds) } }).lean(),
      Station.find({ _id: { $in: Array.from(stationIds) } }).lean(),
    ]);

    const siteMap = new Map<string, any>();
    const deptName = new Map(departments.map((d: any) => [d._id.toString(), d.name]));
    const lineName = new Map(lines.map((l: any) => [l._id.toString(), l.name]));
    const stationName = new Map(stations.map((s: any) => [s._id.toString(), s.name]));

    sites.forEach((s: any) => {
      siteMap.set(s._id.toString(), {
        id: s._id.toString(),
        name: s.name,
        areas: new Map<string, any>(),
      });
    });

    assets.forEach((a: any) => {
      const sid = a.siteId ? a.siteId.toString() : 'unknown';
      const did = a.departmentId ? a.departmentId.toString() : 'unknown';
      const lid = a.lineId ? a.lineId.toString() : 'unknown';
      const stid = a.stationId ? a.stationId.toString() : 'unknown';

      let site = siteMap.get(sid);
      if (!site) {
        site = { id: sid, name: 'Unknown Site', areas: new Map<string, any>() };
        siteMap.set(sid, site);
      }

      let area = site.areas.get(did);
      if (!area) {
        area = {
          id: did,
          name: deptName.get(did) || 'Unknown Area',
          lines: new Map<string, any>(),
        };
        site.areas.set(did, area);
      }

      let line = area.lines.get(lid);
      if (!line) {
        line = {
          id: lid,
          name: lineName.get(lid) || 'Unknown Line',
          stations: new Map<string, any>(),
        };
        area.lines.set(lid, line);
      }

      let station = line.stations.get(stid);
      if (!station) {
        station = {
          id: stid,
          name: stationName.get(stid) || 'Unknown Station',
          assets: [] as any[],
        };
        line.stations.set(stid, station);
      }

      station.assets.push({
        id: a._id.toString(),
        name: a.name,
        qr: a.qrCode ?? generateQrCodeValue({
          type: 'asset',
          id: a._id.toString(),
          ...(req.tenantId ? { tenantId: req.tenantId } : {}),
        }),
      });
    });

    const tree = Array.from(siteMap.values()).map((s: any) => ({
      id: s.id,
      name: s.name,
      areas: Array.from(s.areas.values()).map((a: any) => ({
        id: a.id,
        name: a.name,
        lines: Array.from(a.lines.values()).map((l: any) => ({
          id: l.id,
          name: l.name,
          stations: Array.from(l.stations.values()),
        })),
      })),
    }));

    sendResponse(res, tree);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      const errors = Object.values(verr.errors).map((e) => e.message);
      sendResponse(res, null, errors, 400);
      return;
    }
    next(err);
    return;
  }
}

async function bulkUpdateAssets(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const { assetIds, updates } = (req.body ?? {}) as {
      assetIds?: string[];
      updates?: Record<string, unknown>;
    };

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      sendResponse(res, null, 'assetIds array is required', 400);
      return;
    }

    if (!updates || typeof updates !== 'object') {
      sendResponse(res, null, 'updates payload is required', 400);
      return;
    }

    const normalizedIds = assetIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!normalizedIds.length) {
      sendResponse(res, null, 'No valid asset IDs provided', 400);
      return;
    }

    const allowedFields = new Set([
      'status',
      'departmentId',
      'lineId',
      'stationId',
      'notes',
      'location',
      'criticality',
      'customFields',
    ]);

    const updateBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.has(key)) continue;
      if (['departmentId', 'lineId', 'stationId'].includes(key)) {
        updateBody[key] = value ? toObjectId(value as string) : undefined;
      } else if (key === 'customFields' && typeof value === 'object') {
        updateBody.customFields = value as Record<string, unknown>;
      } else {
        updateBody[key] = value;
      }
    }

    const result = await Asset.updateMany(
      { _id: { $in: normalizedIds }, tenantId },
      { $set: updateBody },
    );

    sendResponse(res, {
      matched: (result as any).matchedCount ?? (result as any).n,
      modified: (result as any).modifiedCount ?? (result as any).nModified,
    });
  } catch (err) {
    next(err);
  }
}

export {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
  getAssetTree,
  bulkUpdateAssets,
};

