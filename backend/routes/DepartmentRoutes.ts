/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { FilterQuery } from 'mongoose';
import Department, { type DepartmentDoc, type LineSubdoc, type StationSubdoc } from '../models/Department';
import Asset from '../models/Asset';
import { requireAuth } from '../middleware/authMiddleware';
import { departmentValidators } from '../validators/departmentValidators';
import { validate } from '../middleware/validationMiddleware';
import type { AuthedRequestHandler } from '../types/http';

interface StationPayload {
  name: string;
}

interface LinePayload {
  name: string;
  stations?: StationPayload[];
}

interface DepartmentPayload {
  name: string;
  lines?: LinePayload[];
}

type DepartmentUpdatePayload = Partial<DepartmentPayload>;

// GET /api/departments → list by tenantId (+optional siteId)
const listDepartments: AuthedRequestHandler<
  Record<string, string>,
  DepartmentDoc[],
  unknown,
  { assetCount?: string }
> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & Record<string, unknown> = {
      tenantId: req.tenantId,
    };
    if (req.siteId) {
      filter.siteId = req.siteId;
    }
    const includeAssetCount = req.query.assetCount === 'true';
    const items = await Department.find(filter)
      .select({ name: 1, lines: 1, createdAt: 1 })
      .lean();

    if (!includeAssetCount) {
      res.json(items);
      return;
    }

    const assetMatch: Record<string, unknown> = {
      tenantId: req.tenantId,
    };
    if (req.siteId) assetMatch.siteId = req.siteId;

    const counts = await Asset.aggregate<{
      _id: any;
      count: number;
    }>([
      { $match: assetMatch },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);
    const map = new Map<string, number>();
    counts.forEach((c) => {
      if (c._id) map.set(c._id.toString(), c.count);
    });
    const withCounts = items.map((d) => ({
      ...d,
      assetCount: map.get(d._id.toString()) || 0,
    }));
    res.json(withCounts);
    return;
  } catch (err) {
    next(err);
  }
};

// GET /api/departments/:id
const getDepartment: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const item = await Department.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
  }
};

// POST /api/departments
const createDepartment: AuthedRequestHandler<
  Record<string, string>,
  DepartmentDoc,
  DepartmentPayload
> = async (req, res, next) => {
  try {
    const doc = await Department.create({
      ...req.body,
      tenantId: req.tenantId,
    });
    res.status(201).json(doc);
    return;
  } catch (err) {
    next(err);
  }
};

// PUT /api/departments/:id
const updateDepartment: AuthedRequestHandler<
  { id: string },
  DepartmentDoc,
  DepartmentUpdatePayload
> = async (req, res, next) => {
  try {
    const doc = await Department.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(doc);
    return;
  } catch (err) {
    next(err);
  }
};

// DELETE /api/departments/:id
const deleteDepartment: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const doc = await Department.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted' });
    return;
  } catch (err) {
    next(err);
  }
};

 // LINE HANDLERS
const getAllLines: AuthedRequestHandler = async (req, res, next) => {
  try {
    const lines = await Department.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $unwind: '$lines' },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$lines', { departmentId: '$_id' }],
          },
        },
      },
    ]).exec();
    res.json(lines);
    return;
  } catch (err) {
    next(err);
  }
};

const getLineById: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.id);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(line);
    return;
  } catch (err) {
    next(err);
  }
};

const createLine: AuthedRequestHandler<
  { deptId: string },
  unknown,
  LinePayload
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }
    department.lines.push({
      name: req.body.name,
      tenantId,
      stations: [] as any,
    } as any);
    await department.save();
    const line = department.lines[department.lines.length - 1];
    res.status(201).json(line);
    return;
  } catch (err) {
    next(err);
  }
};

const updateLine: AuthedRequestHandler<
  { deptId: string; lineId: string },
  unknown,
  Partial<LinePayload>
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    line.set(req.body);
    await department.save();
    res.json(line);
    return;
  } catch (err) {
    next(err);
  }
};

const deleteLine: AuthedRequestHandler<{ deptId: string; lineId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    line.deleteOne();
    await department.save();
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
  }
};

const getLinesByDepartment: AuthedRequestHandler<{ departmentId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.params.departmentId,
      tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(department.lines);
    return;
  } catch (err) {
    next(err);
  }
};

const getLineHierarchy: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.id);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(line);
    return;
  } catch (err) {
    next(err);
  }
};

// STATION HANDLERS
const getAllStations: AuthedRequestHandler = async (req, res, next) => {
  try {
    const departments = await Department.find({ tenantId: req.tenantId });
    const stations = departments.flatMap((dep) =>
      dep.lines.flatMap((line) =>
        line.stations.map((s) => ({ ...s.toObject(), lineId: line._id, departmentId: dep._id })),
      ),
    );
    res.json(stations);
    return;
  } catch (err) {
    next(err);
  }
};

const getStationById: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const department = await Department.findOne({
      'lines.stations._id': req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    let station: StationSubdoc | null = null;
    department.lines.forEach((line: LineSubdoc) => {
      if (station) return;
      const found = line.stations.id(req.params.id) as StationSubdoc | null;
      if (found) {
        station = found;
      }
    });
    if (!station) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(station);
    return;
  } catch (err) {
    next(err);
  }
};

const createStation: AuthedRequestHandler<
  { deptId: string; lineId: string },
  unknown,
  StationPayload
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Line not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Line not found' });
      return;
    }
    line.stations.push({ name: req.body.name, tenantId } as any);
    await department.save();
    const station = line.stations[line.stations.length - 1];
    res.status(201).json(station);
    return;
  } catch (err) {
    next(err);
  }
};

const updateStation: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string },
  unknown,
  Partial<StationPayload>
> = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const station = line.stations.id(req.params.stationId);
    if (!station) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    station.set(req.body);
    await department.save();
    res.json(station);
    return;
  } catch (err) {
    next(err);
  }
};

const deleteStation: AuthedRequestHandler<
  { deptId: string; lineId: string; stationId: string }
> = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const station = line.stations.id(req.params.stationId);
    if (!station) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    station.deleteOne();
    await department.save();
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
  }
};

const getStationsByLine: AuthedRequestHandler<{ lineId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.lineId,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const line = department.lines.id(req.params.lineId);
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(line.stations);
    return;
  } catch (err) {
    next(err);
  }
};

const router = Router();
router.use(requireAuth);
router.get("/", listDepartments);
router.get("/:id", getDepartment);
router.post("/", departmentValidators, validate, createDepartment);
router.put("/:id", departmentValidators, validate, updateDepartment);
router.delete("/:id", deleteDepartment);
router.post("/:deptId/lines", createLine);
router.put("/:deptId/lines/:lineId", updateLine);
router.delete("/:deptId/lines/:lineId", deleteLine);
router.post("/:deptId/lines/:lineId/stations", createStation);
router.put(
  "/:deptId/lines/:lineId/stations/:stationId",
  updateStation,
);
router.delete(
  "/:deptId/lines/:lineId/stations/:stationId",
  deleteStation,
);

export {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllLines,
  getLineById,
  createLine,
  updateLine,
  deleteLine,
  getLinesByDepartment,
  getLineHierarchy,
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  getStationsByLine,
};

export default router;
