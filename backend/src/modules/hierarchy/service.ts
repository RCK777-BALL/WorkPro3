/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';

import Department, { type DepartmentDoc } from '../../../models/Department';
import Line, { type LineDoc } from '../../../models/Line';
import Station, { type StationDoc } from '../../../models/Station';
import Asset, { type AssetDoc } from '../../../models/Asset';
import InventoryItem from '../../../models/InventoryItem';
import WorkHistory, { type WorkHistoryDocument } from '../../../models/WorkHistory';
import DocumentModel from '../../../models/Document';
import PMTask, { type PMTaskDocument } from '../../../models/PMTask';
import WorkOrderModel from '../../../models/WorkOrder';

export class HierarchyError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'HierarchyError';
    this.status = status;
  }
}

const toId = (value?: DepartmentDoc['tenantId'] | LineDoc['tenantId'] | StationDoc['tenantId'] | AssetDoc['tenantId'] | null) =>
  (value ? value.toString() : undefined);

export interface HierarchyAssetNode {
  id: string;
  tenantId: string;
  name: string;
  status?: string;
  type?: AssetDoc['type'];
  criticality?: string;
  departmentId?: string;
  lineId?: string;
  stationId?: string;
  siteId?: string;
  plantId?: string;
}

export interface HierarchyStationNode {
  id: string;
  tenantId: string;
  name: string;
  notes?: string;
  siteId?: string;
  departmentId?: string;
  lineId: string;
  assetCount: number;
  assets: HierarchyAssetNode[];
}

export interface HierarchyLineNode {
  id: string;
  tenantId: string;
  name: string;
  notes?: string;
  departmentId: string;
  siteId?: string;
  assetCount: number;
  assets: HierarchyAssetNode[];
  stations: HierarchyStationNode[];
}

export interface HierarchyDepartmentNode {
  id: string;
  tenantId: string;
  name: string;
  notes?: string;
  plantId?: string;
  siteId?: string;
  assetCount: number;
  assets: HierarchyAssetNode[];
  lines: HierarchyLineNode[];
}

export interface HierarchyTreeResponse {
  departments: HierarchyDepartmentNode[];
}

export interface AssetDetailResponse {
  asset: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    status?: string;
    type?: AssetDoc['type'];
    criticality?: string;
    location?: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    purchaseCost?: number;
    expectedLifeMonths?: number;
    replacementDate?: string;
    siteId?: string;
    plantId?: string;
    lineId?: string;
    stationId?: string;
    departmentId?: string;
  };
  history: Array<{
    id: string;
    date: string;
    title: string;
    status: string;
    duration?: number;
    notes?: string;
  }>;
  documents: Array<{
    id: string;
    name?: string;
    type?: string;
    url: string;
    uploadedAt?: string;
  }>;
  parts: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost?: number;
    location?: string;
  }>;
  pmTemplates: Array<{
    templateId: string;
    assignmentId: string;
    title: string;
    interval?: string;
    active: boolean;
    nextDue?: string;
    usageMetric?: string;
    usageTarget?: number;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    updatedAt?: string;
  }>;
  cost: {
    total: number;
    maintenance: number;
    labor: number;
    parts: number;
    currency: string;
    timeframe: string;
  };
}

type Context = {
  tenantId: string;
  plantId?: string | undefined;
  siteId?: string | undefined;
};

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  items.sort((a, b) => a.name.localeCompare(b.name));

const applyContextFilter = <T extends DepartmentDoc | LineDoc | StationDoc | AssetDoc>(
  filter: FilterQuery<T>,
  context: Context,
) => {
  if (context.plantId) {
    (filter as Record<string, unknown>).plant = context.plantId as unknown;
  }
  if (context.siteId) {
    (filter as Record<string, unknown>).siteId = context.siteId as unknown;
  }
};

export const fetchHierarchy = async (context: Context): Promise<HierarchyTreeResponse> => {
  const departmentFilter: FilterQuery<DepartmentDoc> = { tenantId: context.tenantId };
  applyContextFilter(departmentFilter, context);

  const departments = await Department.find(departmentFilter).lean();
  if (departments.length === 0) {
    return { departments: [] };
  }

  const departmentIds = departments.map((dept) => dept._id);
  const lineFilter: FilterQuery<LineDoc> = {
    tenantId: context.tenantId,
    departmentId: { $in: departmentIds },
  };
  applyContextFilter(lineFilter, context);
  const lines = await Line.find(lineFilter).lean();

  const lineIds = lines.map((line) => line._id);
  const stationFilter: FilterQuery<StationDoc> = { tenantId: context.tenantId };
  if (lineIds.length > 0) {
    stationFilter.lineId = { $in: lineIds } as any;
  }
  applyContextFilter(stationFilter, context);
  const stations = await Station.find(stationFilter).lean();

  const stationIds = stations.map((station) => station._id);
  const assetFilter: FilterQuery<AssetDoc> = { tenantId: context.tenantId };
  const assetRelations: FilterQuery<AssetDoc>[] = [];
  if (departmentIds.length > 0) {
    assetRelations.push({ departmentId: { $in: departmentIds } });
  }
  if (lineIds.length > 0) {
    assetRelations.push({ lineId: { $in: lineIds } });
  }
  if (stationIds.length > 0) {
    assetRelations.push({ stationId: { $in: stationIds } });
  }
  if (assetRelations.length > 0) {
    assetFilter.$or = assetRelations;
  }
  applyContextFilter(assetFilter, context);
  const assets = assetRelations.length > 0 ? await Asset.find(assetFilter).lean() : [];

  const departmentMap = new Map<string, HierarchyDepartmentNode>();
  const lineMap = new Map<string, HierarchyLineNode>();
  const stationMap = new Map<string, HierarchyStationNode>();

  departments.forEach((dept) => {
    const departmentNode: HierarchyDepartmentNode = {
      id: dept._id.toString(),
      tenantId: dept.tenantId.toString(),
      name: dept.name,
      notes: dept.notes ?? '',
      assetCount: 0,
      assets: [],
      lines: [],
    };
    const plantId = toId(dept.plant);
    const siteId = toId(dept.siteId);
    if (plantId) {
      departmentNode.plantId = plantId;
    }
    if (siteId) {
      departmentNode.siteId = siteId;
    }
    departmentMap.set(dept._id.toString(), departmentNode);
  });

  lines.forEach((line) => {
    const departmentId = line.departmentId.toString();
    const lineNode: HierarchyLineNode = {
      id: line._id.toString(),
      tenantId: line.tenantId?.toString() ?? context.tenantId,
      name: line.name,
      notes: line.notes ?? '',
      departmentId,
      assetCount: 0,
      assets: [],
      stations: [],
    };
    const siteId = toId(line.siteId);
    if (siteId) {
      lineNode.siteId = siteId;
    }
    lineMap.set(line._id.toString(), lineNode);
    const department = departmentMap.get(departmentId);
    if (department) {
      department.lines.push(lineNode);
    }
  });

  stations.forEach((station) => {
    const lineId = station.lineId.toString();
    const stationNode: HierarchyStationNode = {
      id: station._id.toString(),
      tenantId: station.tenantId?.toString() ?? context.tenantId,
      name: station.name,
      notes: station.notes ?? '',
      lineId,
      assetCount: 0,
      assets: [],
    };
    if (station.departmentId) {
      stationNode.departmentId = station.departmentId.toString();
    }
    const siteId = toId(station.siteId);
    if (siteId) {
      stationNode.siteId = siteId;
    }
    stationMap.set(station._id.toString(), stationNode);
    const parentLine = lineMap.get(lineId);
    if (parentLine) {
      parentLine.stations.push(stationNode);
    }
  });

  const incrementCounts = (
    department?: HierarchyDepartmentNode,
    line?: HierarchyLineNode,
    station?: HierarchyStationNode,
  ) => {
    if (station) {
      station.assetCount += 1;
    }
    if (line) {
      line.assetCount += 1;
    }
    if (department) {
      department.assetCount += 1;
    }
  };

  assets.forEach((asset) => {
    const assetNode: HierarchyAssetNode = {
      id: asset._id.toString(),
      tenantId: asset.tenantId.toString(),
      name: asset.name,
    };
    if (asset.status) {
      assetNode.status = asset.status;
    }
    if (asset.type) {
      assetNode.type = asset.type;
    }
    if (asset.criticality) {
      assetNode.criticality = asset.criticality;
    }
    const siteId = toId(asset.siteId);
    if (siteId) {
      assetNode.siteId = siteId;
    }
    const plantId = toId(asset.plant);
    if (plantId) {
      assetNode.plantId = plantId;
    }
    if (asset.departmentId) {
      assetNode.departmentId = asset.departmentId.toString();
    }
    if (asset.lineId) {
      assetNode.lineId = asset.lineId.toString();
    }
    if (asset.stationId) {
      assetNode.stationId = asset.stationId.toString();
    }
    const station = assetNode.stationId ? stationMap.get(assetNode.stationId) : undefined;
    if (station) {
      station.assets.push(assetNode);
      const parentLine = lineMap.get(station.lineId);
      const department = station.departmentId ? departmentMap.get(station.departmentId) : undefined;
      incrementCounts(department, parentLine, station);
      return;
    }
    const line = assetNode.lineId ? lineMap.get(assetNode.lineId) : undefined;
    if (line) {
      line.assets.push(assetNode);
      const department = departmentMap.get(line.departmentId);
      incrementCounts(department, line);
      return;
    }
    const department = assetNode.departmentId ? departmentMap.get(assetNode.departmentId) : undefined;
    if (department) {
      department.assets.push(assetNode);
      incrementCounts(department);
    }
  });

  const result = Array.from(departmentMap.values());
  result.forEach((dept) => {
    sortByName(dept.lines);
    dept.lines.forEach((line) => {
      sortByName(line.stations);
      sortByName(line.assets);
      line.stations.forEach((station) => {
        sortByName(station.assets);
      });
    });
    sortByName(dept.assets);
  });

  sortByName(result);
  return { departments: result };
};

const ensureName = (value?: string) => {
  if (!value || !value.trim()) {
    throw new HierarchyError('Name is required');
  }
  return value.trim();
};

export const createDepartment = async (
  context: Context,
  payload: { name?: string; notes?: string; siteId?: string },
) => {
  const name = ensureName(payload.name);
  const plantId = context.plantId ?? context.siteId ?? payload.siteId;
  if (!plantId) {
    throw new HierarchyError('Plant or site context is required');
  }
  const department = await Department.create({
    name,
    notes: payload.notes ?? '',
    tenantId: context.tenantId,
    plant: plantId,
    siteId: payload.siteId ?? context.siteId,
    lines: [],
  });
  return {
    id: department._id.toString(),
    name: department.name,
    notes: department.notes ?? '',
    plantId: toId(department.plant),
    siteId: toId(department.siteId),
  };
};

export const updateDepartment = async (
  context: Context,
  departmentId: string,
  payload: { name?: string; notes?: string },
) => {
  const update: Record<string, unknown> = {};
  if (typeof payload.name === 'string') {
    update.name = ensureName(payload.name);
  }
  if (typeof payload.notes === 'string') {
    update.notes = payload.notes;
  }
  if (Object.keys(update).length === 0) {
    throw new HierarchyError('No fields to update');
  }
  const department = await Department.findOneAndUpdate(
    { _id: departmentId, tenantId: context.tenantId },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (!department) {
    throw new HierarchyError('Department not found', 404);
  }
  return {
    id: department._id.toString(),
    name: department.name,
    notes: department.notes ?? '',
    plantId: toId(department.plant),
    siteId: toId(department.siteId),
  };
};

export const deleteDepartment = async (context: Context, departmentId: string) => {
  const department = await Department.findOneAndDelete({
    _id: departmentId,
    tenantId: context.tenantId,
  });
  if (!department) {
    throw new HierarchyError('Department not found', 404);
  }

  await Promise.all([
    Line.deleteMany({ tenantId: context.tenantId, departmentId }),
    Station.deleteMany({ tenantId: context.tenantId, departmentId }),
    Asset.updateMany(
      { tenantId: context.tenantId, departmentId },
      { $unset: { departmentId: '', lineId: '', stationId: '' } },
    ),
  ]);

  return { id: departmentId };
};

const toLinePayload = (line: LineDoc) => ({
  id: line._id.toString(),
  name: line.name,
  notes: line.notes ?? '',
  departmentId: line.departmentId.toString(),
  siteId: toId(line.siteId),
});

export const createLine = async (
  context: Context,
  payload: { name?: string; notes?: string; departmentId?: string; siteId?: string },
) => {
  const name = ensureName(payload.name);
  if (!payload.departmentId) {
    throw new HierarchyError('Department ID is required');
  }
  const department = await Department.findOne({
    _id: payload.departmentId,
    tenantId: context.tenantId,
  });
  if (!department) {
    throw new HierarchyError('Department not found', 404);
  }
  const plantId = context.plantId ?? department.plant?.toString();
  if (!plantId) {
    throw new HierarchyError('Plant context is required', 400);
  }
  const line = await Line.create({
    name,
    notes: payload.notes ?? '',
    tenantId: context.tenantId,
    plant: plantId,
    siteId: payload.siteId ?? context.siteId ?? department.siteId,
    departmentId: department._id,
  });
  await Department.updateOne(
    { _id: department._id },
    {
      $push: {
        lines: {
          _id: line._id,
          name: line.name,
          notes: line.notes ?? '',
          tenantId: context.tenantId,
          siteId: line.siteId,
          stations: [],
        },
      },
    },
  );
  return toLinePayload(line);
};

export const updateLine = async (
  context: Context,
  lineId: string,
  payload: { name?: string; notes?: string },
) => {
  const update: Record<string, unknown> = {};
  if (typeof payload.name === 'string') {
    update.name = ensureName(payload.name);
  }
  if (typeof payload.notes === 'string') {
    update.notes = payload.notes;
  }
  if (Object.keys(update).length === 0) {
    throw new HierarchyError('No fields to update');
  }
  const line = await Line.findOneAndUpdate(
    { _id: lineId, tenantId: context.tenantId },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (!line) {
    throw new HierarchyError('Line not found', 404);
  }
  await Department.updateOne(
    { _id: line.departmentId, 'lines._id': line._id },
    {
      $set: {
        ...(update.name ? { 'lines.$.name': line.name } : {}),
        ...(update.notes ? { 'lines.$.notes': line.notes ?? '' } : {}),
      },
    },
  );
  return toLinePayload(line);
};

export const deleteLine = async (context: Context, lineId: string) => {
  const line = await Line.findOneAndDelete({ _id: lineId, tenantId: context.tenantId });
  if (!line) {
    throw new HierarchyError('Line not found', 404);
  }
  await Promise.all([
    Station.deleteMany({ tenantId: context.tenantId, lineId }),
    Department.updateOne(
      { _id: line.departmentId },
      { $pull: { lines: { _id: line._id } } },
    ),
    Asset.updateMany(
      { tenantId: context.tenantId, lineId },
      { $unset: { lineId: '', stationId: '' } },
    ),
  ]);
  return { id: lineId };
};

const toStationPayload = (station: StationDoc) => ({
  id: station._id.toString(),
  name: station.name,
  notes: station.notes ?? '',
  lineId: station.lineId.toString(),
  departmentId: station.departmentId.toString(),
  siteId: toId(station.siteId),
});

export const createStation = async (
  context: Context,
  payload: { name?: string; notes?: string; lineId?: string; siteId?: string },
) => {
  const name = ensureName(payload.name);
  if (!payload.lineId) {
    throw new HierarchyError('Line ID is required');
  }
  const line = await Line.findOne({ _id: payload.lineId, tenantId: context.tenantId });
  if (!line) {
    throw new HierarchyError('Line not found', 404);
  }
  const station = await Station.create({
    name,
    notes: payload.notes ?? '',
    tenantId: context.tenantId,
    plant: line.plant,
    siteId: payload.siteId ?? context.siteId ?? line.siteId,
    lineId: line._id,
    departmentId: line.departmentId,
  });
  await Promise.all([
    Line.updateOne({ _id: line._id }, { $addToSet: { stations: station._id } }),
    Department.updateOne(
      { _id: line.departmentId, 'lines._id': line._id },
      {
        $push: {
          'lines.$.stations': {
            _id: station._id,
            name: station.name,
            notes: station.notes ?? '',
            tenantId: context.tenantId,
            siteId: station.siteId,
            lineId: line._id,
            assets: [],
          },
        },
      },
    ),
  ]);
  return toStationPayload(station);
};

export const updateStation = async (
  context: Context,
  stationId: string,
  payload: { name?: string; notes?: string },
) => {
  const update: Record<string, unknown> = {};
  if (typeof payload.name === 'string') {
    update.name = ensureName(payload.name);
  }
  if (typeof payload.notes === 'string') {
    update.notes = payload.notes;
  }
  if (Object.keys(update).length === 0) {
    throw new HierarchyError('No fields to update');
  }
  const station = await Station.findOneAndUpdate(
    { _id: stationId, tenantId: context.tenantId },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (!station) {
    throw new HierarchyError('Station not found', 404);
  }
  await Department.updateOne(
    { _id: station.departmentId, 'lines._id': station.lineId },
    {
      $set: {
        ...(update.name ? { 'lines.$[line].stations.$[station].name': station.name } : {}),
        ...(update.notes ? { 'lines.$[line].stations.$[station].notes': station.notes ?? '' } : {}),
      },
    },
    {
      arrayFilters: [
        { 'line._id': station.lineId },
        { 'station._id': station._id },
      ],
    },
  ).catch(() => undefined);
  return toStationPayload(station);
};

export const deleteStation = async (context: Context, stationId: string) => {
  const station = await Station.findOneAndDelete({ _id: stationId, tenantId: context.tenantId });
  if (!station) {
    throw new HierarchyError('Station not found', 404);
  }
  await Promise.all([
    Line.updateOne({ _id: station.lineId }, { $pull: { stations: station._id } }),
    Department.updateOne(
      { _id: station.departmentId, 'lines._id': station.lineId },
      { $pull: { 'lines.$.stations': { _id: station._id } } },
    ),
    Asset.updateMany({ tenantId: context.tenantId, stationId }, { $unset: { stationId: '' } }),
  ]);
  return { id: stationId };
};

type AssetInput = {
  name?: string;
  type?: AssetDoc['type'];
  status?: string;
  notes?: string;
  description?: string;
  location?: string;
  serialNumber?: string;
  modelName?: string;
  manufacturer?: string;
  purchaseDate?: string | Date;
  warrantyStart?: string | Date;
  warrantyEnd?: string | Date;
  purchaseCost?: number;
  expectedLifeMonths?: number;
  replacementDate?: string | Date;
  criticality?: string;
  departmentId?: string;
  lineId?: string;
  stationId?: string;
};

const resolveAssetContext = async (context: Context, payload: AssetInput) => {
  let departmentId = payload.departmentId;
  let lineId = payload.lineId;
  let stationId = payload.stationId;
  let plantId = context.plantId;
  let siteId = context.siteId;

  if (stationId) {
    const station = await Station.findOne({ _id: stationId, tenantId: context.tenantId });
    if (!station) {
      throw new HierarchyError('Station not found', 404);
    }
    lineId = station.lineId.toString();
    departmentId = station.departmentId.toString();
    plantId = plantId ?? station.plant?.toString();
    siteId = siteId ?? station.siteId?.toString();
  } else if (lineId) {
    const line = await Line.findOne({ _id: lineId, tenantId: context.tenantId });
    if (!line) {
      throw new HierarchyError('Line not found', 404);
    }
    departmentId = line.departmentId.toString();
    plantId = plantId ?? line.plant?.toString();
    siteId = siteId ?? line.siteId?.toString();
  } else if (departmentId) {
    const department = await Department.findOne({ _id: departmentId, tenantId: context.tenantId });
    if (!department) {
      throw new HierarchyError('Department not found', 404);
    }
    plantId = plantId ?? department.plant?.toString();
    siteId = siteId ?? department.siteId?.toString();
  }

  if (!plantId) {
    throw new HierarchyError('Plant context is required for assets', 400);
  }

  return { departmentId, lineId, stationId, plantId, siteId };
};

const toAssetPayload = (asset: AssetDoc) => ({
  id: asset._id.toString(),
  name: asset.name,
  status: asset.status,
  type: asset.type,
  criticality: asset.criticality,
  description: asset.description,
  notes: asset.notes,
  location: asset.location,
  purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : undefined,
  warrantyStart: asset.warrantyStart ? asset.warrantyStart.toISOString() : undefined,
  warrantyEnd: asset.warrantyEnd ? asset.warrantyEnd.toISOString() : undefined,
  purchaseCost: asset.purchaseCost,
  expectedLifeMonths: asset.expectedLifeMonths,
  replacementDate: asset.replacementDate ? asset.replacementDate.toISOString() : undefined,
  departmentId: asset.departmentId ? asset.departmentId.toString() : undefined,
  lineId: asset.lineId ? asset.lineId.toString() : undefined,
  stationId: asset.stationId ? asset.stationId.toString() : undefined,
});

const generateCopyName = async (tenantId: string, baseName: string) => {
  const proposed = `${baseName} (Copy)`;
  const exists = await Asset.exists({ tenantId, name: proposed });
  if (!exists) return proposed;

  let suffix = 2;
  while (suffix < 50) {
    const candidate = `${baseName} (Copy ${suffix})`;
    const duplicate = await Asset.exists({ tenantId, name: candidate });
    if (!duplicate) return candidate;
    suffix += 1;
  }

  throw new HierarchyError('Unable to generate unique asset name');
};

export const createAsset = async (context: Context, payload: AssetInput) => {
  const name = ensureName(payload.name);
  if (!payload.type) {
    throw new HierarchyError('Asset type is required');
  }
  const resolved = await resolveAssetContext(context, payload);
  const asset = await Asset.create({
    name,
    type: payload.type,
    status: payload.status ?? 'Active',
    notes: payload.notes ?? '',
    description: payload.description,
    location: payload.location,
    serialNumber: payload.serialNumber,
    modelName: payload.modelName,
    manufacturer: payload.manufacturer,
    purchaseDate: payload.purchaseDate,
    warrantyStart: payload.warrantyStart,
    warrantyEnd: payload.warrantyEnd,
    purchaseCost: payload.purchaseCost,
    expectedLifeMonths: payload.expectedLifeMonths,
    replacementDate: payload.replacementDate,
    criticality: payload.criticality ?? 'medium',
    tenantId: context.tenantId,
    plant: resolved.plantId,
    siteId: resolved.siteId,
    departmentId: resolved.departmentId,
    lineId: resolved.lineId,
    stationId: resolved.stationId,
  });
  return toAssetPayload(asset);
};

export const updateAsset = async (
  context: Context,
  assetId: string,
  payload: AssetInput,
) => {
  const update: Record<string, unknown> = {};
  if (typeof payload.name === 'string') {
    update.name = ensureName(payload.name);
  }
  if (payload.type) {
    update.type = payload.type;
  }
  if (typeof payload.status === 'string') {
    update.status = payload.status;
  }
  if (typeof payload.notes === 'string') {
    update.notes = payload.notes;
  }
  if (typeof payload.description === 'string') {
    update.description = payload.description;
  }
  if (typeof payload.location === 'string') {
    update.location = payload.location;
  }
  if (typeof payload.serialNumber === 'string') {
    update.serialNumber = payload.serialNumber;
  }
  if (typeof payload.modelName === 'string') {
    update.modelName = payload.modelName;
  }
  if (typeof payload.manufacturer === 'string') {
    update.manufacturer = payload.manufacturer;
  }
  if (payload.purchaseDate) {
    update.purchaseDate = payload.purchaseDate;
  }
  if (payload.warrantyStart) {
    update.warrantyStart = payload.warrantyStart;
  }
  if (payload.warrantyEnd) {
    update.warrantyEnd = payload.warrantyEnd;
  }
  if (payload.purchaseCost !== undefined) {
    update.purchaseCost = payload.purchaseCost;
  }
  if (payload.expectedLifeMonths !== undefined) {
    update.expectedLifeMonths = payload.expectedLifeMonths;
  }
  if (payload.replacementDate) {
    update.replacementDate = payload.replacementDate;
  }
  if (typeof payload.criticality === 'string') {
    update.criticality = payload.criticality;
  }
  if (payload.departmentId || payload.lineId || payload.stationId) {
    const resolved = await resolveAssetContext(context, payload);
    update.departmentId = resolved.departmentId;
    update.lineId = resolved.lineId;
    update.stationId = resolved.stationId;
  }
  if (Object.keys(update).length === 0) {
    throw new HierarchyError('No fields to update');
  }
  const asset = await Asset.findOneAndUpdate(
    { _id: assetId, tenantId: context.tenantId },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (!asset) {
    throw new HierarchyError('Asset not found', 404);
  }
  return toAssetPayload(asset);
};

export const duplicateAsset = async (
  context: Context,
  assetId: string,
  overrides: { name?: string } = {},
) => {
  const asset = await Asset.findOne({ _id: assetId, tenantId: context.tenantId });
  if (!asset) {
    throw new HierarchyError('Asset not found', 404);
  }

  const resolvedName = ensureName(overrides.name ?? (await generateCopyName(context.tenantId, asset.name)));
  const clone = await Asset.create({
    name: resolvedName,
    type: asset.type,
    status: asset.status,
    notes: asset.notes,
    description: asset.description,
    location: asset.location,
    serialNumber: asset.serialNumber,
    modelName: asset.modelName,
    manufacturer: asset.manufacturer,
    purchaseDate: asset.purchaseDate,
    warrantyStart: asset.warrantyStart,
    warrantyEnd: asset.warrantyEnd,
    purchaseCost: asset.purchaseCost,
    expectedLifeMonths: asset.expectedLifeMonths,
    replacementDate: asset.replacementDate,
    criticality: asset.criticality,
    tenantId: context.tenantId,
    plant: asset.plant,
    siteId: asset.siteId,
    departmentId: asset.departmentId,
    lineId: asset.lineId,
    stationId: asset.stationId,
  });

  return toAssetPayload(clone);
};

export const deleteAsset = async (context: Context, assetId: string) => {
  const asset = await Asset.findOneAndDelete({ _id: assetId, tenantId: context.tenantId });
  if (!asset) {
    throw new HierarchyError('Asset not found', 404);
  }
  return { id: assetId };
};

type WorkHistorySource = Array<Pick<WorkHistoryDocument, 'recentWork'>>;

const flattenHistory = (history: WorkHistorySource): AssetDetailResponse['history'] =>
  history
    .flatMap((entry) => entry.recentWork ?? [])
    .map((entry) => {
      const flattened: AssetDetailResponse['history'][number] = {
        id: entry.id,
        date: entry.date,
        title: entry.title,
        status: entry.status,
      };
      if (typeof entry.duration === 'number') {
        flattened.duration = entry.duration;
      }
      if (entry.notes !== undefined) {
        flattened.notes = entry.notes;
      }
      return flattened;
    });

const toPmTemplateSummary = (
  template: PMTaskDocument,
  assetId: string,
): AssetDetailResponse['pmTemplates'] => {
  const assignments = Array.from(template.assignments ?? []);
  return assignments
    .filter((assignment) => assignment.asset?.toString() === assetId)
    .map((assignment) => {
      const summary: AssetDetailResponse['pmTemplates'][number] = {
        templateId: template._id?.toString() ?? '',
        assignmentId: assignment._id?.toString() ?? '',
        title: template.title,
        active: Boolean(template.active),
      };

      if (assignment.interval !== undefined) {
        summary.interval = assignment.interval;
      }

      if (assignment.nextDue) {
        summary.nextDue = assignment.nextDue.toISOString();
      }

      if (assignment.usageMetric !== undefined) {
        summary.usageMetric = assignment.usageMetric;
      }

      if (assignment.usageTarget !== undefined) {
        summary.usageTarget = assignment.usageTarget;
      }

      return summary;
    });
};

export const getAssetDetail = async (context: Context, assetId: string): Promise<AssetDetailResponse> => {
  const asset = await Asset.findOne({ _id: assetId, tenantId: context.tenantId });
  if (!asset) {
    throw new HierarchyError('Asset not found', 404);
  }

  const [history, documents, pmTemplatesRaw, workOrders, parts] = await Promise.all([
    WorkHistory.find({ tenantId: context.tenantId, asset: assetId }).limit(20).lean(),
    DocumentModel.find({ asset: assetId }).sort({ createdAt: -1 }).limit(20).lean(),
    PMTask.find({
      tenantId: context.tenantId,
      $or: [
        { asset: assetId },
        { assignments: { $elemMatch: { asset: assetId } } },
        { _id: { $in: Array.from(asset.pmTemplateIds ?? []) } },
      ],
    } as any)
      .select('title active assignments')
      .lean(),
    WorkOrderModel.find({ tenantId: context.tenantId, assetId }).sort({ updatedAt: -1 }).limit(20).lean(),
    InventoryItem.find({ tenantId: context.tenantId, asset: assetId }).lean(),
  ]);

  const partsCost = workOrders.reduce((sum, order) => {
    const orderParts = Array.from(order.partsUsed ?? []).reduce((acc, part) => acc + (part.cost ?? 0), 0);
    return sum + orderParts;
  }, 0);
  const laborCost = workOrders.reduce(
    (sum, order) => sum + ((order.timeSpentMin ?? 0) / 60) * 75,
    0,
  );
  const maintenance = partsCost + laborCost;

  const assetResponse: AssetDetailResponse['asset'] = {
    id: asset._id.toString(),
    tenantId: asset.tenantId.toString(),
    name: asset.name,
  };
  const description = asset.description ?? asset.notes;
  if (description !== undefined) {
    assetResponse.description = description;
  }
  if (asset.status) {
    assetResponse.status = asset.status;
  }
  if (asset.type) {
    assetResponse.type = asset.type;
  }
  if (asset.criticality) {
    assetResponse.criticality = asset.criticality;
  }
  if (asset.purchaseDate) {
    assetResponse.purchaseDate = asset.purchaseDate.toISOString();
  }
  if (asset.warrantyStart) {
    assetResponse.warrantyStart = asset.warrantyStart.toISOString();
  }
  if (asset.warrantyEnd) {
    assetResponse.warrantyEnd = asset.warrantyEnd.toISOString();
  }
  if (asset.purchaseCost !== undefined) {
    assetResponse.purchaseCost = asset.purchaseCost;
  }
  if (asset.expectedLifeMonths !== undefined) {
    assetResponse.expectedLifeMonths = asset.expectedLifeMonths;
  }
  if (asset.replacementDate) {
    assetResponse.replacementDate = asset.replacementDate.toISOString();
  }
  if (asset.location !== undefined) {
    assetResponse.location = asset.location;
  }
  if (asset.serialNumber !== undefined) {
    assetResponse.serialNumber = asset.serialNumber;
  }
  if (asset.siteId) {
    assetResponse.siteId = asset.siteId.toString();
  }
  if (asset.plant) {
    assetResponse.plantId = asset.plant.toString();
  }
  if (asset.lineId) {
    assetResponse.lineId = asset.lineId.toString();
  }
  if (asset.stationId) {
    assetResponse.stationId = asset.stationId.toString();
  }
  if (asset.departmentId) {
    assetResponse.departmentId = asset.departmentId.toString();
  }

  return {
    asset: assetResponse,
    history: flattenHistory(history),
    documents: documents.map((doc) => {
      const documentResponse: AssetDetailResponse['documents'][number] = {
        id: doc._id.toString(),
        url: doc.url,
      };
      const name = doc.name ?? doc.title;
      if (name !== undefined) {
        documentResponse.name = name;
      }
      if (doc.type) {
        documentResponse.type = doc.type;
      }
      const uploadedAt = doc.createdAt?.toISOString();
      if (uploadedAt) {
        documentResponse.uploadedAt = uploadedAt;
      }
      return documentResponse;
    }),
    parts: parts.map((part) => {
      const partResponse: AssetDetailResponse['parts'][number] = {
        id: part._id.toString(),
        name: part.name,
        quantity: part.quantity,
      };
      if (typeof part.unitCost === 'number') {
        partResponse.unitCost = part.unitCost;
      }
      if (part.location !== undefined) {
        partResponse.location = part.location;
      }
      return partResponse;
    }),
    pmTemplates: (pmTemplatesRaw as unknown as PMTaskDocument[]).flatMap((template) =>
      toPmTemplateSummary(template, assetId),
    ),
    workOrders: workOrders.map((order) => {
      const workOrderResponse: AssetDetailResponse['workOrders'][number] = {
        id: order._id.toString(),
        title: order.title,
        status: order.status,
        priority: order.priority,
        type: order.type,
      };
      const updatedAt = order.updatedAt?.toISOString();
      if (updatedAt) {
        workOrderResponse.updatedAt = updatedAt;
      }
      return workOrderResponse;
    }),
    cost: {
      total: maintenance,
      maintenance,
      labor: laborCost,
      parts: partsCost,
      currency: 'USD',
      timeframe: 'Trailing 12M',
    },
  };
};
