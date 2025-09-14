/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import { Types } from 'mongoose';
import Asset from '../models/Asset';
import Site from '../models/Site';
import Department from '../models/Department';
import Line from '../models/Line';
import Station from '../models/Station';
import { validationResult, ValidationError } from 'express-validator';
import logger from '../utils/logger';
import { filterFields } from '../utils/filterFields';
import { writeAuditLog } from '../utils/audit';

const assetCreateFields = [
  'name', 'type', 'location', 'departmentId', 'status', 'serialNumber',
  'description', 'modelName', 'manufacturer', 'purchaseDate', 'installationDate',
  'lineId', 'stationId', 'siteId', 'criticality', 'documents',
];

const assetUpdateFields = [...assetCreateFields];

export const getAllAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const assets = await Asset.find(filter);
    res.json(assets);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getAssetById: AuthedRequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ message: 'ID is required' });
      return;
    }
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const filter: any = { _id: id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOne(filter);
    if (!asset) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(asset);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createAsset: AuthedRequestHandler = async (req, res, next) => {

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
    return res.status(400).json({ message: 'Tenant ID required' });
  }

  if (!req.body.name) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() as ValidationError[] });
      return;
    }

    const payload: Record<string, unknown> = filterFields(
      req.body,
      assetCreateFields,
    );
    payload.tenantId = tenantId;
    if (req.siteId && !payload.siteId) payload.siteId = req.siteId;

    const newAsset = await Asset.create(payload);
    const assetObj = newAsset.toObject();
    const response = { ...assetObj, tenantId: assetObj.tenantId.toString() };
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Asset',
      entityId: newAsset._id,
      after: assetObj,
    });
    res.status(201).json(response);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateAsset: AuthedRequestHandler = async (req, res, next) => {
 
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
    return res.status(400).json({ message: 'Tenant ID required' });
  }

  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'ID is required' });
    }
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const errors = validationResult(req as any);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() as ValidationError[] });
      return;
    }

    const filter: any = { _id: id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const update = filterFields(req.body, assetUpdateFields);
    const existing = await Asset.findOne(filter);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const asset = await Asset.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Asset',
      entityId: new Types.ObjectId(id),
      before: existing.toObject(),
      after: asset?.toObject(),
    });
    res.json(asset);
    return;

  } catch (err) {
    return next(err);
  }
};

export const deleteAsset: AuthedRequestHandler = async (req, res, next) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'ID is required' });
    }
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const asset = await Asset.findOneAndDelete(filter);
    if (!asset) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Asset',
      entityId: new Types.ObjectId(id),
      before: asset.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};

export const searchAssets: AuthedRequestHandler = async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');

    const filter: any = { name: { $regex: regex }, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const assets = await Asset.find(filter).limit(10);
    res.json(assets);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getAssetTree: AuthedRequestHandler = async (req, res, next) => {
  try {
    const match: any = { tenantId: req.tenantId };
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

    res.json(tree);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
