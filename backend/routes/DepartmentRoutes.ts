import { Router } from "express";
import type { FilterQuery } from "mongoose";
import Department, { type DepartmentDoc } from "../models/Department";
import Asset from "../models/Asset";
import { requireAuth } from "../middleware/authMiddleware";
import { departmentValidators } from "../validators/departmentValidators";
import { validate } from "../middleware/validationMiddleware";
import type { AuthedRequestHandler } from "../types/http";

// GET /api/departments → list by tenantId (+optional siteId)
const listDepartments: AuthedRequestHandler<
  unknown,
  any,
  unknown,
  { assetCount?: string }
> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      tenantId: req.tenantId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const includeAssetCount = req.query.assetCount === "true";
    const items = await Department.find(filter)
      .select({ name: 1, lines: 1, createdAt: 1 })
      .lean();

    if (!includeAssetCount) return res.json(items);

    const assetMatch: FilterQuery<{ tenantId: unknown; siteId?: unknown }> = {
      tenantId: req.tenantId,
    };
    if (req.siteId) assetMatch.siteId = req.siteId;

    const counts = await Asset.aggregate<{
      _id: any;
      count: number;
    }>([
      { $match: { ...assetMatch } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]);
    const map = new Map<string, number>();
    counts.forEach((c) => {
      if (c._id) map.set(c._id.toString(), c.count);
    });
    const withCounts = items.map((d) => ({
      ...d,
      assetCount: map.get(d._id.toString()) || 0,
    }));
    return res.json(withCounts);
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
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    next(err);
  }
};

// POST /api/departments
const createDepartment: AuthedRequestHandler = async (req, res, next) => {
  try {
    const doc = await Department.create({
      ...req.body,
      tenantId: req.tenantId,
    });
    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

// PUT /api/departments/:id
const updateDepartment: AuthedRequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const doc = await Department.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
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
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

 // LINE HANDLERS
const getAllLines: AuthedRequestHandler = async (req, res, next) => {
  try {
    const lines = await Department.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $unwind: "$lines" },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$lines", { departmentId: "$_id" }],
          },
        },
      },
    ]).exec();
    res.json(lines);
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
      "lines._id": req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: "Not found" });
    res.json(line);
  } catch (err) {
    next(err);
  }
};

const createLine: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department)
      return res.status(404).json({ message: "Department not found" });
    department.lines.push({
      name: req.body.name,
      tenantId: req.tenantId,
      stations: [] as any,
    } as any);
    await department.save();
    const line = department.lines[department.lines.length - 1];
    res.status(201).json(line);
  } catch (err) {
    next(err);
  }
};

const updateLine: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Not found" });
    line.set(req.body);
    await department.save();
    res.json(line);
  } catch (err) {
    next(err);
  }
};

const deleteLine: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Not found" });
    line.deleteOne();
    await department.save();
    res.json({ message: "Deleted successfully" });
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
    const department = await Department.findOne({
      _id: req.params.departmentId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    res.json(department.lines);
 
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
      "lines._id": req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: "Not found" });
    res.json(line);
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
      "lines.stations._id": req.params.id,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    let station;
    department.lines.forEach((line) => {
      const s = line.stations.id(req.params.id);
      if (s) station = s;
    });
    if (!station) return res.status(404).json({ message: "Not found" });
    res.json(station);
 
  } catch (err) {
    next(err);
  }
};

 const createStation: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Line not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Line not found" });
    line.stations.push({ name: req.body.name, tenantId: req.tenantId } as any);
    await department.save();
    const station = line.stations[line.stations.length - 1];
    res.status(201).json(station);

  } catch (err) {
    next(err);
  }
};

 const updateStation: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Not found" });
    const station = line.stations.id(req.params.stationId);
    if (!station) return res.status(404).json({ message: "Not found" });
    station.set(req.body);
    await department.save();
    res.json(station);

  } catch (err) {
    next(err);
  }
};

 const deleteStation: AuthedRequestHandler = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Not found" });
    const station = line.stations.id(req.params.stationId);
    if (!station) return res.status(404).json({ message: "Not found" });
    station.deleteOne();
    await department.save();
    res.json({ message: "Deleted successfully" });
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
      "lines._id": req.params.lineId,
      tenantId: req.tenantId,
    });
    if (!department) return res.status(404).json({ message: "Not found" });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: "Not found" });
    res.json(line.stations);
 
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
