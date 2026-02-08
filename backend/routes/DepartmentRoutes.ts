/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import ExcelJS from 'exceljs';
import { Types, type FilterQuery } from 'mongoose';

import Department, { type DepartmentDoc } from '../models/Department';
import Line, { type LineDoc } from '../models/Line';
import Station, { type StationDoc } from '../models/Station';
import Asset, { type AssetDoc } from '../models/Asset';
import Plant, { type PlantDoc } from '../models/Plant';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { departmentValidators } from '../validators/departmentValidators';
import { validate } from '../middleware/validationMiddleware';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import sendResponse from '../utils/sendResponse';

const excelMimeTypes = new Set<`application/${string}`>([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (excelMimeTypes.has(file.mimetype as `application/${string}`)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type'));
  },
});

const handleExcelUpload: RequestHandler = (req, res, next) => {
  const upload = excelUpload.single('file');
  upload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        sendResponse(res, null, 'File too large', 400);
        return;
      }
      sendResponse(res, null, err.message, 400);
      return;
    }

    sendResponse(res, null, err instanceof Error ? err.message : 'Invalid file upload', 400);
  });
};

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

type PlantNode = {
  _id: string;
  name?: string;
  location?: string;
  description?: string;
};

interface DepartmentNode {
  _id: string;
  name: string;
  notes?: string;
  description?: string;
  plant?: PlantNode;
  lines: LineNode[];
  assetCount?: number;
}

const router = Router();
const departmentValidationHandlers = departmentValidators as unknown as RequestHandler[];
router.use(requireAuth);
router.use(tenantScope);

const resolvePlantId = (req: AuthedRequest): string | undefined => req.plantId ?? req.siteId ?? undefined;

const parseInclude = (value: unknown): Set<string> => {
  if (typeof value !== 'string') return new Set();
  return new Set(
    value
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
};

const extractPlantNode = (plant: unknown): PlantNode | undefined => {
  if (!plant) {
    return undefined;
  }

  if (typeof plant === 'string') {
    return { _id: plant };
  }

  if (plant instanceof Types.ObjectId) {
    return { _id: plant.toString() };
  }

  if (typeof plant === 'object') {
    const candidate = plant as Partial<PlantDoc> & { _id?: Types.ObjectId | string };
    if (!candidate._id) {
      return undefined;
    }
    const id = candidate._id instanceof Types.ObjectId ? candidate._id.toString() : String(candidate._id);
    const node: PlantNode = { _id: id };
    if (typeof candidate.name === 'string') {
      node.name = candidate.name;
    }
    if (typeof candidate.location === 'string') {
      node.location = candidate.location;
    }
    if (typeof candidate.description === 'string') {
      node.description = candidate.description;
    }
    return node;
  }

  return undefined;
};

const buildDepartmentNodes = async (
  authedReq: AuthedRequest,
  filter: FilterQuery<DepartmentDoc>,
  include: Set<string>,
): Promise<DepartmentNode[]> => {
  const plantId = resolvePlantId(authedReq);
  const scopedFilter: FilterQuery<DepartmentDoc> = { ...filter };
  if (plantId) {
    scopedFilter.plant = plantId as any;
  }
  const includeLines = include.has('lines') || include.has('stations') || include.has('assets');
  const includeStations = include.has('stations') || include.has('assets');
  const includeAssets = include.has('assets');

  const departments = await Department.find(scopedFilter)
    .sort({ name: 1 })
    .select({ name: 1, notes: 1, plant: 1 })
    .populate('plant', 'name location description')
    .exec();

  if (!includeLines) {
    return departments.map((dept) => {
      const plantNode = extractPlantNode(dept.plant);
      return {
        _id: dept._id.toString(),
        name: dept.name,
        notes: dept.notes ?? '',
        description: dept.notes ?? '',
        ...(plantNode ? { plant: plantNode } : {}),
        lines: [],
      };
    });
  }

  const deptIds = departments.map((dept) => dept._id);
  if (deptIds.length === 0) {
    return departments.map((dept) => {
      const plantNode = extractPlantNode(dept.plant);
      return {
        _id: dept._id.toString(),
        name: dept.name,
        notes: dept.notes ?? '',
        description: dept.notes ?? '',
        ...(plantNode ? { plant: plantNode } : {}),
        lines: [],
      };
    });
  }

  const lineFilter: FilterQuery<LineDoc> = {
    tenantId: authedReq.tenantId,
    departmentId: { $in: deptIds },
  };
  if (plantId) {
    lineFilter.plant = plantId as any;
  }
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
    if (plantId) {
      stationFilter.plant = plantId as any;
    }
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
    if (plantId) {
      assetFilter.plant = plantId as any;
    }
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
    const plantNode = extractPlantNode(dept.plant);
    return {
      _id: deptId,
      name: dept.name,
      notes: dept.notes ?? '',
      description: dept.notes ?? '',
      ...(plantNode ? { plant: plantNode } : {}),
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
  const plantId = resolvePlantId(authedReq);
  if (plantId) {
    filter.plant = plantId as any;
  }

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

const shouldIncludeAssetCount = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
};

const listDepartments: AuthedRequestHandler<
  Record<string, string>,
  DepartmentNode[]
> = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const filter: FilterQuery<DepartmentDoc> = { tenantId: authedReq.tenantId };
    const plantId = resolvePlantId(authedReq);
    if (plantId) {
      filter.plant = plantId as any;
    }
    if (authedReq.siteId) {
      filter.$or = [
        { siteId: authedReq.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }

    const include = parseInclude(req.query.include);
    const includeAssetCount = shouldIncludeAssetCount(req.query.assetCount);
    const result = await buildDepartmentNodes(authedReq, filter, include);

    if (!includeAssetCount || result.length === 0) {
      sendResponse(res, result, null, 200, 'Departments retrieved');
      return;
    }

    const deptIds = result.map((dept) => new Types.ObjectId(dept._id));
    const counts = await Asset.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          tenantId: authedReq.tenantId,
          departmentId: { $in: deptIds },
          ...(plantId ? { plant: new Types.ObjectId(plantId) } : {}),
        },
      },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>(
      counts.map((entry) => [entry._id.toString(), entry.count] as const),
    );

    const payload = result.map((dept) => ({
      ...dept,
      assetCount: countMap.get(dept._id) ?? 0,
    }));

    sendResponse(res, payload, null, 200, 'Departments retrieved');
  } catch (err) {
    next(err);
  }
};

const listDepartmentsByPlant: AuthedRequestHandler<
  { plantId: string },
  DepartmentNode[]
> = async (req, res, next) => {
  try {
    const plantId = req.params.plantId;
    if (!plantId || !Types.ObjectId.isValid(plantId)) {
      sendResponse(res, null, 'Invalid plant identifier', 400);
      return;
    }

    const authedReq = req as AuthedRequest;
    const include = parseInclude(req.query.include);
    const filter: FilterQuery<DepartmentDoc> = {
      tenantId: authedReq.tenantId,
      $or: [
        { plant: new Types.ObjectId(plantId) },
        { siteId: plantId as any },
        { siteId: new Types.ObjectId(plantId) },
      ],
    };

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

type NestedStationPayload = { name?: string; notes?: string | null } | null | undefined;
type NestedLinePayload = {
  name?: string;
  notes?: string | null;
  stations?: NestedStationPayload[] | null;
} | null;

const normalizeStationInput = (value: NestedStationPayload): { name: string; notes?: string } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const rawName = typeof value.name === 'string' ? value.name.trim() : '';
  if (!rawName) {
    return null;
  }
  const station: { name: string; notes?: string } = { name: rawName };
  if (typeof value.notes === 'string' && value.notes.trim()) {
    station.notes = value.notes;
  }
  return station;
};

const normalizeLineInput = (value: NestedLinePayload): { name: string; notes?: string; stations: { name: string; notes?: string }[] } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const rawName = typeof value.name === 'string' ? value.name.trim() : '';
  if (!rawName) {
    return null;
  }
  const line: { name: string; notes?: string; stations: { name: string; notes?: string }[] } = {
    name: rawName,
    stations: [],
  };
  if (typeof value.notes === 'string' && value.notes.trim()) {
    line.notes = value.notes;
  }
  if (Array.isArray(value.stations)) {
    line.stations = value.stations
      .map((station) => normalizeStationInput(station))
      .filter((station): station is { name: string; notes?: string } => Boolean(station));
  }
  return line;
};

const createDepartment: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  { name: string; notes?: string; description?: string; lines?: NestedLinePayload[] }
> = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const plantId = resolvePlantId(req as AuthedRequest);
    if (!plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }

    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!rawName) {
      sendResponse(res, null, 'Department name is required', 400);
      return;
    }

    const description =
      typeof req.body?.description === 'string'
        ? req.body.description
        : typeof req.body?.notes === 'string'
          ? req.body.notes
          : '';

    const department = await Department.create({
      name: rawName,
      notes: description,
      tenantId: req.tenantId,
      siteId: req.siteId,
      plant: plantId as any,
    });

    const linesInput = Array.isArray(req.body?.lines)
      ? req.body.lines
          .map((line) => normalizeLineInput(line))
          .filter((line): line is { name: string; notes?: string; stations: { name: string; notes?: string }[] } => Boolean(line))
      : [];

    if (linesInput.length > 0) {
      for (const lineInput of linesInput) {
        const line = await Line.create({
          name: lineInput.name,
          notes: lineInput.notes,
          departmentId: department._id,
          tenantId: req.tenantId,
          siteId: department.siteId ?? req.siteId,
          plant: plantId as any,
        });

        const stationDocs = [] as StationDoc[];
        if (lineInput.stations.length > 0) {
          for (const stationInput of lineInput.stations) {
            const station = await Station.create({
              name: stationInput.name,
              notes: stationInput.notes,
              tenantId: req.tenantId,
              departmentId: department._id,
              lineId: line._id,
              siteId: department.siteId ?? req.siteId,
              plant: plantId as any,
            });
            stationDocs.push(station);
          }
        }

        if (stationDocs.length > 0) {
          line.stations = stationDocs.map((station) => station._id) as any;
          await line.save();
        }

        department.lines.push({
          _id: line._id,
          name: line.name,
          notes: line.notes ?? '',
          tenantId: req.tenantId as any,
          stations: stationDocs.map((station) => ({
            _id: station._id,
            name: station.name,
            notes: station.notes ?? '',
            assets: [],
          })) as any,
        } as any);
      }

      await department.save();
    }

    const node = await fetchDepartmentNode(req as AuthedRequest, department._id.toString());
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 201, 'Department created');
  } catch (err) {
    next(err);
  }
};

const updateDepartment: AuthedRequestHandler<
  { id: string },
  DepartmentNode | { message: string },
  { name?: string; notes?: string | null; description?: string | null }
> = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const department = await Department.findOne({
      _id: req.params.id,
      tenantId: authedReq.tenantId,
    });

    if (!department) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    if (typeof req.body?.name === 'string') {
      department.name = req.body.name.trim();
    }

    const bodyHasDescription = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'description');
    if (bodyHasDescription) {
      const rawDescription = req.body?.description;
      if (typeof rawDescription === 'string') {
        department.notes = rawDescription.trim();
      } else if (rawDescription === null) {
        department.notes = '';
      }
    } else if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'notes')) {
      const rawNotes = req.body?.notes;
      if (typeof rawNotes === 'string') {
        department.notes = rawNotes.trim();
      } else if (rawNotes === null) {
        department.notes = '';
      }
    }

    const targetPlantId = resolvePlantId(authedReq);
    const currentPlantId = department.plant?.toString();
    let updatedPlant: PlantDoc | null = null;

    if (targetPlantId && targetPlantId !== currentPlantId) {
      updatedPlant = await Plant.findOne({
        _id: targetPlantId,
        ...(authedReq.tenantId ? { tenantId: authedReq.tenantId } : {}),
      });

      if (!updatedPlant) {
        sendResponse(res, null, 'Plant not found', 404);
        return;
      }

      department.plant = updatedPlant._id;
      if (authedReq.siteId) {
        department.siteId = authedReq.siteId as any;
      }
    }

    await department.save();

    if (updatedPlant) {
      const siteUpdate = authedReq.siteId ? { siteId: authedReq.siteId as any } : {};
      await Promise.all([
        Line.updateMany(
          { departmentId: department._id, tenantId: authedReq.tenantId },
          { $set: { plant: updatedPlant._id, ...siteUpdate } },
        ),
        Station.updateMany(
          { departmentId: department._id, tenantId: authedReq.tenantId },
          { $set: { plant: updatedPlant._id, ...siteUpdate } },
        ),
        Asset.updateMany(
          { departmentId: department._id, tenantId: authedReq.tenantId },
          { $set: { plant: updatedPlant._id, ...siteUpdate } },
        ),
      ]);
    }

    const node = await fetchDepartmentNode(authedReq, department._id.toString());
    if (!node) {
      sendResponse(res, null, 'Failed to load department', 500);
      return;
    }

    sendResponse(res, node, null, 200, 'Department updated');
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
      plant: department.plant ?? req.plantId ?? req.siteId,
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

    sendResponse(res, node, null, 200, 'Line created');
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
      plant: line.plant ?? department.plant ?? req.plantId ?? req.siteId,
      siteId: line.siteId ?? department.siteId ?? req.siteId,
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

    sendResponse(res, node, null, 200, 'Station created');
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
      departmentId: department._id,
      department: department.name,
      line: line.name,
      station: station.name,
      lineId: line._id,
      stationId: station._id,
      tenantId: new Types.ObjectId(tenantId),
    };

    if (typeof req.body?.description === 'string') {
      payload.description = req.body.description;
    }

    if (typeof req.body?.notes === 'string') {
      payload.notes = req.body.notes;
    }

    if (typeof req.body?.location === 'string') {
      payload.location = req.body.location;
    }

    if (department.siteId) {
      payload.siteId = department.siteId;
    } else if (req.siteId) {
      payload.siteId = new Types.ObjectId(req.siteId);
    }

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
      if (Number.isNaN(parsed.valueOf())) {
        asset.set('lastServiced', undefined);
      } else {
        asset.lastServiced = parsed;
      }
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

const formatDateValue = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toISOString().split('T')[0];
};

const exportDepartmentsToExcel: AuthedRequestHandler = async (req, res, next) => {
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

    const departments = await buildDepartmentNodes(authedReq, filter, defaultInclude());

    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();
    const worksheet = workbook.addWorksheet('Departments');

    worksheet.columns = [
      { header: 'Department Name', key: 'departmentName', width: 28 },
      { header: 'Department Notes', key: 'departmentNotes', width: 32 },
      { header: 'Line Name', key: 'lineName', width: 26 },
      { header: 'Line Notes', key: 'lineNotes', width: 32 },
      { header: 'Station Name', key: 'stationName', width: 26 },
      { header: 'Station Notes', key: 'stationNotes', width: 32 },
      { header: 'Asset Name', key: 'assetName', width: 30 },
      { header: 'Asset Type', key: 'assetType', width: 18 },
      { header: 'Asset Status', key: 'assetStatus', width: 18 },
      { header: 'Asset Description', key: 'assetDescription', width: 36 },
      { header: 'Asset Notes', key: 'assetNotes', width: 32 },
      { header: 'Asset Location', key: 'assetLocation', width: 24 },
      { header: 'Asset Last Serviced', key: 'assetLastServiced', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const addRow = (data: Record<string, string>) => {
      worksheet.addRow(data);
    };

    if (departments.length === 0) {
      addRow({});
    } else {
      departments.forEach((department) => {
        if (department.lines.length === 0) {
          addRow({
            departmentName: department.name,
            departmentNotes: department.notes ?? department.description ?? '',
          });
          return;
        }

        department.lines.forEach((line) => {
          const lineNotes = line.notes ?? line.description ?? '';
          if (line.stations.length === 0) {
            addRow({
              departmentName: department.name,
              departmentNotes: department.notes ?? department.description ?? '',
              lineName: line.name,
              lineNotes,
            });
            return;
          }

          line.stations.forEach((station) => {
            const stationNotes = station.notes ?? station.description ?? '';
            if (station.assets.length === 0) {
              addRow({
                departmentName: department.name,
                departmentNotes: department.notes ?? department.description ?? '',
                lineName: line.name,
                lineNotes,
                stationName: station.name,
                stationNotes,
              });
              return;
            }

            station.assets.forEach((asset) => {
              addRow({
                departmentName: department.name,
                departmentNotes: department.notes ?? department.description ?? '',
                lineName: line.name,
                lineNotes,
                stationName: station.name,
                stationNotes,
                assetName: asset.name,
                assetType: asset.type,
                assetStatus: asset.status ?? '',
                assetDescription: asset.description ?? '',
                assetNotes: asset.notes ?? '',
                assetLocation: asset.location ?? '',
                assetLastServiced: formatDateValue(asset.lastServiced ?? null),
              });
            });
          });
        });
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="departments.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

type AssetImportPayload = {
  name: string;
  type: AssetDoc['type'];
  status: 'Active' | 'Offline' | 'In Repair';
  description?: string;
  notes?: string;
  location?: string;
  lastServiced?: Date;
};

type StationImportPayload = {
  name: string;
  notes?: string;
  assets: AssetImportPayload[];
};

type LineImportPayload = {
  name: string;
  notes?: string;
  stations: Map<string, StationImportPayload>;
};

type DepartmentImportPayload = {
  name: string;
  notes?: string;
  lines: Map<string, LineImportPayload>;
};

type ImportSummary = {
  createdDepartments: number;
  createdLines: number;
  createdStations: number;
  createdAssets: number;
  warnings: string[];
};

const getOrCreate = <K, V>(map: Map<K, V>, key: K, create: () => V): V => {
  let value = map.get(key);
  if (!value) {
    value = create();
    map.set(key, value);
  }
  return value;
};

const columnNames = {
  departmentName: 'department name',
  departmentNotes: 'department notes',
  lineName: 'line name',
  lineNotes: 'line notes',
  stationName: 'station name',
  stationNotes: 'station notes',
  assetName: 'asset name',
  assetType: 'asset type',
  assetStatus: 'asset status',
  assetDescription: 'asset description',
  assetNotes: 'asset notes',
  assetLocation: 'asset location',
  assetLastServiced: 'asset last serviced',
} as const;

const normalizeAssetType = (value: string): AssetDoc['type'] | null => {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'electrical':
      return 'Electrical';
    case 'mechanical':
      return 'Mechanical';
    case 'tooling':
      return 'Tooling';
    case 'interface':
      return 'Interface';
    default:
      return null;
  }
};

const normalizeAssetStatus = (value: string): 'Active' | 'Offline' | 'In Repair' => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'offline') {
    return 'Offline';
  }
  if (normalized === 'in repair' || normalized === 'inrepair') {
    return 'In Repair';
  }
  return 'Active';
};

const convertExcelSerialDate = (value: number): Date | undefined => {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const milliseconds = Math.round(value * 24 * 60 * 60 * 1000);
  const date = new Date(excelEpoch.getTime() + milliseconds);
  if (Number.isNaN(date.valueOf())) {
    return undefined;
  }
  return date;
};

const getCellText = (
  row: ExcelJS.Row,
  columns: Map<string, number>,
  key: keyof typeof columnNames,
): string => {
  const columnIndex = columns.get(columnNames[key]);
  if (!columnIndex) {
    return '';
  }
  const cell = row.getCell(columnIndex);
  const rawText = typeof cell.text === 'string' ? cell.text.trim() : '';
  if (rawText) {
    return rawText;
  }
  const { value } = cell;
  if (value == null) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim();
  }
  return String(value).trim();
};

const getCellDate = (
  row: ExcelJS.Row,
  columns: Map<string, number>,
  key: keyof typeof columnNames,
): Date | undefined => {
  const columnIndex = columns.get(columnNames[key]);
  if (!columnIndex) {
    return undefined;
  }
  const cell = row.getCell(columnIndex);
  const { value } = cell;
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return convertExcelSerialDate(value);
  }
  const text = getCellText(row, columns, key);
  if (!text) {
    return undefined;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.valueOf())) {
    return undefined;
  }
  return parsed;
};

const importDepartmentsFromExcel: AuthedRequestHandler<Record<string, string>, ImportSummary> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    if (!file?.buffer) {
      sendResponse(res, null, 'No file uploaded', 400);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      sendResponse(res, null, 'Workbook is empty', 400);
      return;
    }

    const headerRow = worksheet.getRow(1);
    const columnIndexMap = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const header = typeof cell.text === 'string' ? cell.text.trim().toLowerCase() : '';
      if (header) {
        columnIndexMap.set(header, colNumber);
      }
    });

    if (!columnIndexMap.has(columnNames.departmentName)) {
      sendResponse(res, null, 'Department Name column is required', 400);
      return;
    }

    const departments = new Map<string, DepartmentImportPayload>();
    const warnings: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const values = Array.isArray(row.values) ? row.values : [];
      const hasContent = values.some((value, index) => {
        if (index === 0) {
          return false;
        }
        if (value == null) {
          return false;
        }
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        return true;
      });

      if (!hasContent) {
        return;
      }

      const departmentName = getCellText(row, columnIndexMap, 'departmentName');
      const lineName = getCellText(row, columnIndexMap, 'lineName');
      const stationName = getCellText(row, columnIndexMap, 'stationName');
      const assetName = getCellText(row, columnIndexMap, 'assetName');

      if (!departmentName) {
        if (lineName || stationName || assetName) {
          warnings.push(`Row ${rowNumber}: Department name is required.`);
        }
        return;
      }

      const departmentKey = departmentName.toLowerCase();
      const department = getOrCreate<string, DepartmentImportPayload>(
        departments,
        departmentKey,
        () => ({
          name: departmentName,
          lines: new Map<string, LineImportPayload>(),
        }),
      );

      const departmentNotes = getCellText(row, columnIndexMap, 'departmentNotes');
      if (departmentNotes && !department.notes) {
        department.notes = departmentNotes;
      }

      if (!lineName) {
        return;
      }

      const lineKey = `${departmentKey}::${lineName.toLowerCase()}`;
      const line = getOrCreate<string, LineImportPayload>(
        department.lines,
        lineKey,
        () => ({
          name: lineName,
          stations: new Map<string, StationImportPayload>(),
        }),
      );

      const lineNotes = getCellText(row, columnIndexMap, 'lineNotes');
      if (lineNotes && !line.notes) {
        line.notes = lineNotes;
      }

      if (!stationName) {
        return;
      }

      const stationKey = `${lineKey}::${stationName.toLowerCase()}`;
      const station = getOrCreate<string, StationImportPayload>(
        line.stations,
        stationKey,
        () => ({
          name: stationName,
          assets: [],
        }),
      );

      const stationNotes = getCellText(row, columnIndexMap, 'stationNotes');
      if (stationNotes && !station.notes) {
        station.notes = stationNotes;
      }

      if (!assetName) {
        return;
      }

      const rawType = getCellText(row, columnIndexMap, 'assetType');
      const normalizedType = normalizeAssetType(rawType);
      if (!normalizedType) {
        warnings.push(
          `Row ${rowNumber}: Invalid asset type "${rawType}". Asset for station "${station.name}" skipped.`,
        );
        return;
      }

      const rawStatus = getCellText(row, columnIndexMap, 'assetStatus');
      const asset: AssetImportPayload = {
        name: assetName,
        type: normalizedType,
        status: normalizeAssetStatus(rawStatus),
      };

      const assetDescription = getCellText(row, columnIndexMap, 'assetDescription');
      if (assetDescription) {
        asset.description = assetDescription;
      }

      const assetNotes = getCellText(row, columnIndexMap, 'assetNotes');
      if (assetNotes) {
        asset.notes = assetNotes;
      }

      const assetLocation = getCellText(row, columnIndexMap, 'assetLocation');
      if (assetLocation) {
        asset.location = assetLocation;
      }

      const lastServiced = getCellDate(row, columnIndexMap, 'assetLastServiced');
      if (lastServiced) {
        asset.lastServiced = lastServiced;
      }

      station.assets.push(asset);
    });

    if (departments.size === 0) {
      const summary: ImportSummary = {
        createdDepartments: 0,
        createdLines: 0,
        createdStations: 0,
        createdAssets: 0,
        warnings,
      };
      sendResponse(res, summary, null, 200, 'No departments found in spreadsheet');
      return;
    }

    let createdDepartments = 0;
    let createdLines = 0;
    let createdStations = 0;
    let createdAssets = 0;

    for (const departmentEntry of departments.values()) {
      const department = await Department.create({
        name: departmentEntry.name,
        notes: departmentEntry.notes ?? '',
        tenantId,
        siteId: req.siteId ?? undefined,
      });
      createdDepartments += 1;

      for (const lineEntry of departmentEntry.lines.values()) {
        const siteId = department.siteId ?? (req.siteId ? new Types.ObjectId(req.siteId) : undefined);
        const line = await Line.create({
          name: lineEntry.name,
          notes: lineEntry.notes,
          departmentId: department._id,
          tenantId,
          siteId,
        });
        createdLines += 1;

        const stationDocs: { doc: StationDoc; entry: StationImportPayload }[] = [];

        for (const stationEntry of lineEntry.stations.values()) {
          const station = await Station.create({
            name: stationEntry.name,
            notes: stationEntry.notes,
            tenantId,
            departmentId: department._id,
            lineId: line._id,
            siteId,
          });
          createdStations += 1;
          stationDocs.push({ doc: station, entry: stationEntry });
        }

        if (stationDocs.length > 0) {
          line.stations = stationDocs.map(({ doc }) => doc._id) as any;
          await line.save();
        }

        await Department.updateOne(
          { _id: department._id, tenantId },
          {
            $push: {
              lines: {
                _id: line._id,
                name: line.name,
                notes: line.notes ?? '',
                tenantId: req.tenantId as any,
                stations: stationDocs.map(({ doc }) => ({
                  _id: doc._id,
                  name: doc.name,
                  notes: doc.notes ?? '',
                  assets: [],
                })),
              },
            },
          },
        );

        for (const { doc: stationDoc, entry: stationEntry } of stationDocs) {
          for (const assetEntry of stationEntry.assets) {
            const assetPayload: Partial<AssetDoc> = {
              name: assetEntry.name,
              type: assetEntry.type,
              status: assetEntry.status,
              departmentId: department._id,
              department: department.name,
              line: line.name,
              station: stationDoc.name,
              lineId: line._id,
              stationId: stationDoc._id,
              tenantId: new Types.ObjectId(tenantId),
            };

            if (assetEntry.description) {
              assetPayload.description = assetEntry.description;
            }

            if (assetEntry.notes) {
              assetPayload.notes = assetEntry.notes;
            }

            if (assetEntry.location) {
              assetPayload.location = assetEntry.location;
            }

            if (assetEntry.lastServiced) {
              assetPayload.lastServiced = assetEntry.lastServiced;
            }

            if (department.siteId) {
              assetPayload.siteId = department.siteId;
            } else if (req.siteId) {
              assetPayload.siteId = new Types.ObjectId(req.siteId);
            }

            const asset = await Asset.create(assetPayload);
            createdAssets += 1;

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
                  { 'station._id': stationDoc._id },
                ],
              },
            );
          }
        }
      }
    }

    const summary: ImportSummary = {
      createdDepartments,
      createdLines,
      createdStations,
      createdAssets,
      warnings,
    };

    sendResponse(res, summary, null, 201, 'Departments imported');
  } catch (err) {
    next(err);
  }
};

router.get('/', listDepartments);
router.get('/export', exportDepartmentsToExcel);
router.get('/plant/:plantId', listDepartmentsByPlant);
router.get('/:id', getDepartment);
router.post('/', ...departmentValidationHandlers, validate, createDepartment);
router.post('/import', handleExcelUpload, importDepartmentsFromExcel);
router.put('/:id', ...departmentValidationHandlers, validate, updateDepartment);
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
