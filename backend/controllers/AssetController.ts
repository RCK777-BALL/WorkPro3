/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from '../types/http';
import type { ParsedQs } from 'qs';
import mongoose, { Error as MongooseError, Types } from 'mongoose';
import Asset from '../models/Asset';
import Site from '../models/Site';
import Department from '../models/Department';
import Line from '../models/Line';
import Station, { type StationDoc } from '../models/Station';
import { validationResult, ValidationError } from 'express-validator';
import logger from '../utils/logger';
import { filterFields } from '../utils/filterFields';
import { writeAuditLog } from '../utils/audit';
import { toEntityId, toObjectId } from '../utils/ids';
import { sendResponse } from '../utils/sendResponse';
import type { ParamsDictionary } from 'express-serve-static-core';

type AssetParams = ParamsDictionary & { id: string };
type AssetBody = Record<string, unknown> & { name?: string };
type AssetUpdateBody = Record<string, unknown>;
type SearchAssetsQuery = ParsedQs & { q?: string };

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
  'installationDate',
  'line',
  'lineId',
  'station',
  'stationId',
  'siteId',
  'criticality',
  'documents',
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

export async function getAllAssets(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter);
    sendResponse(res, assets);
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

export async function getAssetById(
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
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, asset);
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

export async function createAsset(
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
      stationForAsset = await Station.findOne({ _id: stationId, tenantId });
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
      const lineDoc = await Line.findOne({ _id: lineId, tenantId });
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
    }
    payload.tenantId = tenantId;
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;

    const newAsset = await Asset.create(payload);
    await addAssetToHierarchy({
      tenantId,
      departmentId: newAsset.departmentId as MaybeObjectId,
      lineId: newAsset.lineId as MaybeObjectId,
      stationId: newAsset.stationId as MaybeObjectId,
      assetId: newAsset._id,
    });
    const assetObj = newAsset.toObject();
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
    const response = { ...assetObj, tenantId: assetObj.tenantId.toString() };
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Asset',
      entityId: toEntityId(newAsset._id as Types.ObjectId),
      after: assetObj,
    });
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

export async function updateAsset(
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

    const filter: Record<string, unknown> = { _id: id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const update = filterFields(req.body, assetUpdateFields);
    let stationForAsset: StationDoc | null = null;
    if (update.stationId) {
      const stationId = update.stationId as string;
      if (!mongoose.Types.ObjectId.isValid(stationId)) {
        sendResponse(res, null, 'Invalid stationId', 400);
        return;
      }
      stationForAsset = await Station.findOne({ _id: stationId, tenantId });
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
      const lineDoc = await Line.findOne({ _id: lineId, tenantId });
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
    }
    const existing = await Asset.findOne(filter);
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const asset = await Asset.findOneAndUpdate(filter, update, {
      new: true,
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Asset',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: existing.toObject(),
      after: asset?.toObject(),
    });
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

    sendResponse(res, asset);
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

export async function deleteAsset(
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
    const filter: Record<string, unknown> = { _id: id, tenantId };
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
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Asset',
      entityId: toEntityId(new Types.ObjectId(id)),
      before: asset.toObject(),
    });
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

export async function searchAssets(
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
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter).limit(10);
    sendResponse(res, assets);
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

export async function getAssetTree(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const match: Record<string, unknown> = { tenantId: req.tenantId };
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
        qr: JSON.stringify({ type: 'asset', id: a._id.toString() }),
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

