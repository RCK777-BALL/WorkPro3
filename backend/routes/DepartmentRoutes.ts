/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { FilterQuery } from 'mongoose';

import Department, { type DepartmentDoc } from '../models/Department';
import Line, { type LineDoc } from '../models/Line';
import Station, { type StationDoc } from '../models/Station';
import Asset, { type AssetDoc } from '../models/Asset';
import { requireAuth } from '../middleware/authMiddleware';
import { departmentValidators } from '../validators/departmentValidators';
import { validate } from '../middleware/validationMiddleware';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import sendResponse from '../utils/sendResponse';

interface AssetNode {
  _id: string;
  name: string;
  type: string;
  status?: string;
  criticality?: string;
  notes?: string;
  location?: string;
}

interface StationNode {
  _id: string;
  name: string;
  notes?: string;
  assets: AssetNode[];
}

interface LineNode {
  _id: string;
  name: string;
  notes?: string;
  stations: StationNode[];
}

interface DepartmentNode {
  _id: string;
  name: string;
  notes?: string;
  lines: LineNode[];
}

const router = Router();
router.use(requireAuth);

const parseInclude = (value: unknown): Set<string> => {
  if (typeof value !== 'string') return new Set();
  return new Set(
    value
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
};

const buildDepartmentNodes = async (
  req: AuthedRequest,
  filter: FilterQuery<DepartmentDoc>,
  include: Set<string>,
): Promise<DepartmentNode[]> => {
  const includeLines = include.has('lines') || include.has('stations') || include.has('assets');
  const includeStations = include.has('stations') || include.has('assets');
  const includeAssets = include.has('assets');

  const departments = await Department.find(filter)
    .sort({ name: 1 })
    .select({ name: 1, notes: 1 })
    .exec();

  if (!includeLines) {
    return departments.map((dept) => ({
      _id: dept._id.toString(),
      name: dept.name,
      notes: dept.notes ?? '',
      lines: [],
    }));
  }

  const deptIds = departments.map((dept) => dept._id);
  if (deptIds.length === 0) {
    return departments.map((dept) => ({
      _id: dept._id.toString(),
      name: dept.name,
      notes: dept.notes ?? '',
      lines: [],
    }));
  }

  const lineFilter: FilterQuery<LineDoc> = {
    tenantId: req.tenantId,
    departmentId: { $in: deptIds },
  };
  if (req.siteId) {
    lineFilter.$or = [
      { siteId: req.siteId },
      { siteId: null },
      { siteId: { $exists: false } },
    ];
  }

  const lineDocs = await Line.find(lineFilter).sort({ name: 1 }).exec();

  const lineIds = lineDocs.map((line) => line._id);

  let stationDocs: StationDoc[] = [];
  if (includeStations && lineIds.length > 0) {
    const stationFilter: FilterQuery<StationDoc> = {
      tenantId: req.tenantId,
      lineId: { $in: lineIds },
    };
    if (req.siteId) {
      stationFilter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    stationDocs = await Station.find(stationFilter).sort({ name: 1 }).exec();
  }

  let assetDocs: AssetDoc[] = [];
  if (includeAssets && stationDocs.length > 0) {
    const stationIds = stationDocs.map((station) => station._id);
    const assetFilter: FilterQuery<AssetDoc> = {
      tenantId: req.tenantId,
      stationId: { $in: stationIds },
    };
    if (req.siteId) {
      assetFilter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    assetDocs = await Asset.find(assetFilter)
      .select({ name: 1, type: 1, status: 1, criticality: 1, stationId: 1, notes: 1, location: 1 })
      .sort({ name: 1 })
      .exec();
  }

  const assetMap = new Map<string, AssetNode[]>();
  assetDocs.forEach((asset) => {
    if (!asset.stationId) return;
    const stationId = asset.stationId.toString();
    const list = assetMap.get(stationId) ?? [];
    list.push({
      _id: asset._id.toString(),
      name: asset.name,
      type: asset.type,
      status: asset.status,
      criticality: asset.criticality,
      notes: asset.notes ?? '',
      location: asset.location,
    });
    assetMap.set(stationId, list);
  });

  const stationMap = new Map<string, StationNode[]>();
  stationDocs.forEach((station) => {
    const lineId = station.lineId.toString();
    const stationId = station._id.toString();
    const assets = assetMap.get(stationId) ?? [];
    assets.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type.localeCompare(b.type);
    });
    const nodes = stationMap.get(lineId) ?? [];
    nodes.push({
      _id: stationId,
      name: station.name,
      notes: station.notes ?? '',
      assets,
    });
    stationMap.set(lineId, nodes);
  });

  const lineMap = new Map<string, LineNode[]>();
  lineDocs.forEach((line) => {
    const deptId = line.departmentId.toString();
    const lineId = line._id.toString();
    const stations = stationMap.get(lineId) ?? [];
    stations.sort((a, b) => a.name.localeCompare(b.name));
    const nodes = lineMap.get(deptId) ?? [];
    nodes.push({
      _id: lineId,
      name: line.name,
      notes: line.notes ?? '',
      stations,
    });
    lineMap.set(deptId, nodes);
  });

  return departments.map<DepartmentNode>((dept) => {
    const deptId = dept._id.toString();
    const lines = lineMap.get(deptId) ?? [];
    lines.sort((a, b) => a.name.localeCompare(b.name));
    return {
      _id: deptId,
      name: dept.name,
      notes: dept.notes ?? '',
      lines,
    };
  });
};

const listDepartments: AuthedRequestHandler<
  Record<string, string>,
  DepartmentNode[]
> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> = { tenantId: req.tenantId };
    if (req.siteId) {
      filter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }

    const include = parseInclude(req.query.include);
    const result = await buildDepartmentNodes(req, filter, include);
    sendResponse(res, result, null, 200, 'Departments retrieved');
  } catch (err) {
    next(err);
  }
};

const getDepartment: AuthedRequestHandler<
  { id: string },
  DepartmentNode | { message: string }
> = async (req, res, next) => {
  try {
    const include = parseInclude(req.query.include);
    const filter: FilterQuery<DepartmentDoc> = {
      tenantId: req.tenantId,
    };
    filter._id = req.params.id as any;
    if (req.siteId) {
      filter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    const result = await buildDepartmentNodes(req, filter, include);
    if (result.length === 0) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, result[0], null, 200, 'Department retrieved');
  } catch (err) {
    next(err);
  }
};

const createDepartment: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  { name: string; notes?: string }
> = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const department = await Department.create({
      name: req.body.name,
      notes: req.body.notes ?? '',
      tenantId: req.tenantId,
      siteId: req.siteId,
    });
    const payload: DepartmentNode = {
      _id: department._id.toString(),
      name: department.name,
      notes: department.notes ?? '',
      lines: [] as LineNode[],
    };
    sendResponse(res, payload, null, 201, 'Department created');
  } catch (err) {
    next(err);
  }
};

const updateDepartment: AuthedRequestHandler<
  { id: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { name: req.body.name, notes: req.body.notes ?? '' } },
      { new: true },
    );
    if (!department) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const payload: DepartmentNode = {
      _id: department._id.toString(),
      name: department.name,
      notes: department.notes ?? '',
      lines: [],
    };
    sendResponse(res, payload, null, 200, 'Department updated');
  } catch (err) {
    next(err);
  }
};

const deleteDepartment: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const department = await Department.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const lines = await Line.find({ departmentId: department._id, tenantId: req.tenantId }).select({ _id: 1 });
    const lineIds = lines.map((line) => line._id);
    const stations = await Station.find({
      tenantId: req.tenantId,
      lineId: { $in: lineIds },
    }).select({ _id: 1 });
    const stationIds = stations.map((station) => station._id);

    if (lineIds.length) {
      await Line.deleteMany({ _id: { $in: lineIds } });
    }
    if (stationIds.length) {
      await Station.deleteMany({ _id: { $in: stationIds } });
      await Asset.updateMany(
        { stationId: { $in: stationIds } },
        { $unset: { stationId: '', lineId: '' } },
      );
    }

    sendResponse(
      res,
      { id: department._id.toString() },
      null,
      200,
      'Department deleted',
    );
  } catch (err) {
    next(err);
  }
};

router.get('/', listDepartments);
router.get('/:id', getDepartment);
router.post('/', departmentValidators, validate, createDepartment);
router.put('/:id', departmentValidators, validate, updateDepartment);
router.delete('/:id', deleteDepartment);

export { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
export default router;
