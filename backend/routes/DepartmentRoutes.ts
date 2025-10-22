/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { type FilterQuery } from 'mongoose';

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
  description?: string;
  lastServiced?: string;
}

interface StationNode {
  _id: string;
  name: string;
  notes?: string;
  description?: string;
  assets: AssetNode[];
}

interface LineNode {
  _id: string;
  name: string;
  notes?: string;
  description?: string;
  stations: StationNode[];
}

interface DepartmentNode {
  _id: string;
  name: string;
  notes?: string;
  description?: string;
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
  authedReq: AuthedRequest,
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
      description: dept.notes ?? '',
      lines: [],
    }));
  }

  const deptIds = departments.map((dept) => dept._id);
  if (deptIds.length === 0) {
    return departments.map((dept) => ({
      _id: dept._id.toString(),
      name: dept.name,
      notes: dept.notes ?? '',
      description: dept.notes ?? '',
      lines: [],
    }));
  }

  const lineFilter: FilterQuery<LineDoc> = {
    tenantId: authedReq.tenantId,
    departmentId: { $in: deptIds },
  };
  if (authedReq.siteId) {
    lineFilter.$or = [
      { siteId: authedReq.siteId },
      { siteId: null },
      { siteId: { $exists: false } },
    ];
  }

  const lineDocs = await Line.find(lineFilter).sort({ name: 1 }).exec();

  const lineIds = lineDocs.map((line) => line._id);

  let stationDocs: StationDoc[] = [];
  if (includeStations && lineIds.length > 0) {
    const stationFilter: FilterQuery<StationDoc> = {
      tenantId: authedReq.tenantId,
      lineId: { $in: lineIds },
    };
    if (authedReq.siteId) {
      stationFilter.$or = [
        { siteId: authedReq.siteId },
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
      tenantId: authedReq.tenantId,
      stationId: { $in: stationIds },
    };
    if (authedReq.siteId) {
      assetFilter.$or = [
        { siteId: authedReq.siteId },
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
    const node: AssetNode = {
      _id: asset._id.toString(),
      name: asset.name,
      type: asset.type,
      notes: asset.notes ?? '',
    };
    if (asset.status !== undefined) {
      node.status = asset.status;
    }
    if (asset.criticality !== undefined) {
      node.criticality = asset.criticality;
    }
    if (asset.location !== undefined) {
      node.location = asset.location;
    }
    if (asset.description !== undefined) {
      node.description = asset.description;
    }
    if (asset.lastServiced instanceof Date && !Number.isNaN(asset.lastServiced.valueOf())) {
      node.lastServiced = asset.lastServiced.toISOString();
    }
    list.push(node);
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
      description: station.notes ?? '',
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
      description: line.notes ?? '',
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
      description: dept.notes ?? '',
      lines,
    };
  });
};

const defaultInclude = (): Set<string> => new Set(['lines', 'stations', 'assets']);

const fetchDepartmentNode = async (
  authedReq: AuthedRequest,
  departmentId: string,
  include?: Set<string>,
): Promise<DepartmentNode | null> => {
  const filter: FilterQuery<DepartmentDoc> = {
    tenantId: authedReq.tenantId,
    _id: departmentId as any,
  };

  if (authedReq.siteId) {
    filter.$or = [
      { siteId: authedReq.siteId },
      { siteId: null },
      { siteId: { $exists: false } },
    ];
  }

  const result = await buildDepartmentNodes(authedReq, filter, include ?? defaultInclude());
  return result[0] ?? null;
};

const listDepartments: AuthedRequestHandler<
  Record<string, string>,
  DepartmentNode[]
> = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const filter: FilterQuery<DepartmentDoc> = { tenantId: authedReq.tenantId };
    if (authedReq.siteId) {
      filter.$or = [
        { siteId: authedReq.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }

    const include = parseInclude(req.query.include);
    const result = await buildDepartmentNodes(authedReq, filter, include);
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
    const authedReq = req as AuthedRequest;
    const include = parseInclude(req.query.include);
    const filter: FilterQuery<DepartmentDoc> = {
      tenantId: authedReq.tenantId,
    };
    filter._id = req.params.id as any;
    if (authedReq.siteId) {
      filter.$or = [
        { siteId: authedReq.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    const result = await buildDepartmentNodes(authedReq, filter, include);
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
    const description =
      typeof req.body?.description === 'string'
        ? req.body.description
        : typeof req.body?.notes === 'string'
          ? req.body.notes
          : '';
    const department = await Department.create({
      name: req.body.name,
      notes: description,
      tenantId: req.tenantId,
      siteId: req.siteId,
    });
    const payload: DepartmentNode = {
      _id: department._id.toString(),
      name: department.name,
      notes: department.notes ?? '',
      description: department.notes ?? '',
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
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string') {
      updates.name = req.body.name;
    }
    if (typeof req.body?.description === 'string') {
      updates.notes = req.body.description;
    } else if (typeof req.body?.notes === 'string') {
      updates.notes = req.body.notes;
    }
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: updates },
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
      description: department.notes ?? '',
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

const createLineForDepartment: AuthedRequestHandler<
  { deptId: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!rawName) {
      sendResponse(res, null, 'Line name is required', 400);
      return;
    }

    const department = await Department.findOne({ _id: req.params.deptId, tenantId });
    if (!department) {
      sendResponse(res, null, 'Department not found', 404);
      return;
    }

    const line = await Line.create({
      name: rawName,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      departmentId: department._id,
      tenantId,
      siteId: department.siteId ?? req.siteId,
    });

    await Department.updateOne(
      { _id: department._id, tenantId },
      {
        $push: {
          lines: {
            _id: line._id,
            name: line.name,
            notes: line.notes ?? '',
            tenantId,
            stations: [],
          },
        },
      },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, department._id.toString());
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 201, 'Line created');
  } catch (err) {
    next(err);
  }
};

const updateLineForDepartment: AuthedRequestHandler<
  { deptId: string; lineId: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string') {
      const trimmed = req.body.name.trim();
      if (!trimmed) {
        sendResponse(res, null, 'Line name cannot be empty', 400);
        return;
      }
      updates.name = trimmed;
    }
    if (typeof req.body?.notes === 'string') {
      updates.notes = req.body.notes;
    }

    if (Object.keys(updates).length === 0) {
      sendResponse(res, null, 'No updates provided', 400);
      return;
    }

    const line = await Line.findOneAndUpdate(
      { _id: req.params.lineId, tenantId, departmentId: req.params.deptId },
      { $set: updates },
      { new: true },
    );

    if (!line) {
      sendResponse(res, null, 'Line not found', 404);
      return;
    }

    const setPayload: Record<string, unknown> = {};
    if (updates.name) {
      setPayload['lines.$[line].name'] = line.name;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      setPayload['lines.$[line].notes'] = line.notes ?? '';
    }

    if (Object.keys(setPayload).length > 0) {
      await Department.updateOne(
        { _id: req.params.deptId, tenantId },
        { $set: setPayload },
        {
          arrayFilters: [{ 'line._id': line._id }],
        },
      );
    }

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Line updated');
  } catch (err) {
    next(err);
  }
};

const deleteLineForDepartment: AuthedRequestHandler<
  { deptId: string; lineId: string },
  DepartmentNode | { message: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const line = await Line.findOne({
      _id: req.params.lineId,
      tenantId,
      departmentId: req.params.deptId,
    });

    if (!line) {
      sendResponse(res, null, 'Line not found', 404);
      return;
    }

    const stations = await Station.find({
      lineId: line._id,
      tenantId,
    }).select({ _id: 1 });

    const stationIds = stations.map((station) => station._id);

    if (stationIds.length > 0) {
      await Station.deleteMany({ _id: { $in: stationIds } });
      await Asset.deleteMany({ stationId: { $in: stationIds }, tenantId });
    }

    await Line.deleteOne({ _id: line._id });
    await Department.updateOne(
      { _id: req.params.deptId, tenantId },
      { $pull: { lines: { _id: line._id } } },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Line deleted');
  } catch (err) {
    next(err);
  }
};

const createStationForLine: AuthedRequestHandler<
  { deptId: string; lineId: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!rawName) {
      sendResponse(res, null, 'Station name is required', 400);
      return;
    }

    const department = await Department.findOne({ _id: req.params.deptId, tenantId });
    if (!department) {
      sendResponse(res, null, 'Department not found', 404);
      return;
    }

    const line = await Line.findOne({
      _id: req.params.lineId,
      tenantId,
      departmentId: department._id,
    });

    if (!line) {
      sendResponse(res, null, 'Line not found', 404);
      return;
    }

    const station = await Station.create({
      name: rawName,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      tenantId,
      departmentId: department._id,
      lineId: line._id,
      siteId: department.siteId ?? req.siteId,
    });

    await Line.updateOne(
      { _id: line._id },
      { $push: { stations: station._id } },
    );

    await Department.updateOne(
      { _id: department._id, tenantId },
      {
        $push: {
          'lines.$[line].stations': {
            _id: station._id,
            name: station.name,
            notes: station.notes ?? '',
            assets: [],
          },
        },
      },
      {
        arrayFilters: [{ 'line._id': line._id }],
      },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, department._id.toString());
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 201, 'Station created');
  } catch (err) {
    next(err);
  }
};

const updateStationForLine: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string') {
      const trimmed = req.body.name.trim();
      if (!trimmed) {
        sendResponse(res, null, 'Station name cannot be empty', 400);
        return;
      }
      updates.name = trimmed;
    }
    if (typeof req.body?.notes === 'string') {
      updates.notes = req.body.notes;
    }

    if (Object.keys(updates).length === 0) {
      sendResponse(res, null, 'No updates provided', 400);
      return;
    }

    const station = await Station.findOneAndUpdate(
      {
        _id: req.params.stationId,
        tenantId,
        lineId: req.params.lineId,
        departmentId: req.params.deptId,
      },
      { $set: updates },
      { new: true },
    );

    if (!station) {
      sendResponse(res, null, 'Station not found', 404);
      return;
    }

    const setPayload: Record<string, unknown> = {};
    if (updates.name) {
      setPayload['lines.$[line].stations.$[station].name'] = station.name;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      setPayload['lines.$[line].stations.$[station].notes'] = station.notes ?? '';
    }

    if (Object.keys(setPayload).length > 0) {
      await Department.updateOne(
        { _id: req.params.deptId, tenantId },
        { $set: setPayload },
        {
          arrayFilters: [
            { 'line._id': station.lineId },
            { 'station._id': station._id },
          ],
        },
      );
    }

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Station updated');
  } catch (err) {
    next(err);
  }
};

const deleteStationForLine: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string },
  DepartmentNode | { message: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const station = await Station.findOne({
      _id: req.params.stationId,
      tenantId,
      lineId: req.params.lineId,
      departmentId: req.params.deptId,
    });

    if (!station) {
      sendResponse(res, null, 'Station not found', 404);
      return;
    }

    await Asset.deleteMany({ stationId: station._id, tenantId });
    await Station.deleteOne({ _id: station._id });
    await Line.updateOne({ _id: station.lineId }, { $pull: { stations: station._id } });
    await Department.updateOne(
      { _id: req.params.deptId, tenantId },
      { $pull: { 'lines.$[line].stations': { _id: station._id } } },
      { arrayFilters: [{ 'line._id': station.lineId }] },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Station deleted');
  } catch (err) {
    next(err);
  }
};

const allowedAssetTypes = new Set(['Electrical', 'Mechanical', 'Tooling', 'Interface']);

const createAssetForStation: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string },
  DepartmentNode | { message: string },
  {
    name?: string;
    type?: string;
    status?: string;
    description?: string;
    notes?: string;
    location?: string;
    lastServiced?: string;
  }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      sendResponse(res, null, 'Asset name is required', 400);
      return;
    }

    const type = typeof req.body?.type === 'string' ? req.body.type : '';
    if (!allowedAssetTypes.has(type)) {
      sendResponse(res, null, 'Invalid asset type', 400);
      return;
    }

    const department = await Department.findOne({ _id: req.params.deptId, tenantId });
    if (!department) {
      sendResponse(res, null, 'Department not found', 404);
      return;
    }

    const line = await Line.findOne({
      _id: req.params.lineId,
      tenantId,
      departmentId: department._id,
    });
    if (!line) {
      sendResponse(res, null, 'Line not found', 404);
      return;
    }

    const station = await Station.findOne({
      _id: req.params.stationId,
      tenantId,
      lineId: line._id,
      departmentId: department._id,
    });
    if (!station) {
      sendResponse(res, null, 'Station not found', 404);
      return;
    }

    const payload: Partial<AssetDoc> = {
      name,
      type: type as AssetDoc['type'],
      status: typeof req.body?.status === 'string' ? req.body.status : 'Active',
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      location: typeof req.body?.location === 'string' ? req.body.location : undefined,
      departmentId: department._id,
      department: department.name,
      line: line.name,
      station: station.name,
      lineId: line._id,
      stationId: station._id,
      tenantId,
      siteId: department.siteId ?? req.siteId,
    };

    if (req.body?.lastServiced) {
      const parsed = new Date(req.body.lastServiced);
      if (!Number.isNaN(parsed.valueOf())) {
        payload.lastServiced = parsed;
      }
    }

    const asset = await Asset.create(payload);

    await Department.updateOne(
      { _id: department._id, tenantId },
      {
        $push: {
          'lines.$[line].stations.$[station].assets': asset._id,
        },
      },
      {
        arrayFilters: [
          { 'line._id': line._id },
          { 'station._id': station._id },
        ],
      },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, department._id.toString());
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 201, 'Asset created');
  } catch (err) {
    next(err);
  }
};

const updateAssetForStation: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string; assetId: string },
  DepartmentNode | { message: string },
  {
    name?: string;
    type?: string;
    status?: string;
    description?: string;
    notes?: string;
    location?: string;
    lastServiced?: string;
  }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const asset = await Asset.findOne({
      _id: req.params.assetId,
      tenantId,
      departmentId: req.params.deptId,
      lineId: req.params.lineId,
      stationId: req.params.stationId,
    });

    if (!asset) {
      sendResponse(res, null, 'Asset not found', 404);
      return;
    }

    if (typeof req.body?.name === 'string') {
      const trimmed = req.body.name.trim();
      if (!trimmed) {
        sendResponse(res, null, 'Asset name cannot be empty', 400);
        return;
      }
      asset.name = trimmed;
    }

    if (typeof req.body?.type === 'string') {
      if (!allowedAssetTypes.has(req.body.type)) {
        sendResponse(res, null, 'Invalid asset type', 400);
        return;
      }
      asset.type = req.body.type as AssetDoc['type'];
    }

    if (typeof req.body?.status === 'string') {
      asset.status = req.body.status;
    }

    if (typeof req.body?.description === 'string') {
      asset.description = req.body.description;
    }

    if (typeof req.body?.notes === 'string') {
      asset.notes = req.body.notes;
    }

    if (typeof req.body?.location === 'string') {
      asset.location = req.body.location;
    }

    if (req.body?.lastServiced) {
      const parsed = new Date(req.body.lastServiced);
      asset.lastServiced = Number.isNaN(parsed.valueOf()) ? undefined : parsed;
    }

    await asset.save();

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Asset updated');
  } catch (err) {
    next(err);
  }
};

const deleteAssetForStation: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string; assetId: string },
  DepartmentNode | { message: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const asset = await Asset.findOne({
      _id: req.params.assetId,
      tenantId,
      departmentId: req.params.deptId,
      lineId: req.params.lineId,
      stationId: req.params.stationId,
    });

    if (!asset) {
      sendResponse(res, null, 'Asset not found', 404);
      return;
    }

    await Asset.deleteOne({ _id: asset._id });
    await Department.updateOne(
      { _id: req.params.deptId, tenantId },
      {
        $pull: {
          'lines.$[line].stations.$[station].assets': asset._id,
        },
      },
      {
        arrayFilters: [
          { 'line._id': asset.lineId },
          { 'station._id': asset.stationId },
        ],
      },
    );

    const node = await fetchDepartmentNode(req as AuthedRequest, req.params.deptId);
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Asset deleted');
  } catch (err) {
    next(err);
  }
};

router.get('/', listDepartments);
router.get('/:id', getDepartment);
router.post('/', departmentValidators, validate, createDepartment);
router.put('/:id', departmentValidators, validate, updateDepartment);
router.delete('/:id', deleteDepartment);
router.post('/:deptId/lines', createLineForDepartment);
router.put('/:deptId/lines/:lineId', updateLineForDepartment);
router.delete('/:deptId/lines/:lineId', deleteLineForDepartment);
router.post('/:deptId/lines/:lineId/stations', createStationForLine);
router.put('/:deptId/lines/:lineId/stations/:stationId', updateStationForLine);
router.delete('/:deptId/lines/:lineId/stations/:stationId', deleteStationForLine);
router.post(
  '/:deptId/lines/:lineId/stations/:stationId/assets',
  createAssetForStation,
);
router.put(
  '/:deptId/lines/:lineId/stations/:stationId/assets/:assetId',
  updateAssetForStation,
);
router.delete(
  '/:deptId/lines/:lineId/stations/:stationId/assets/:assetId',
  deleteAssetForStation,
);

export { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
export default router;
