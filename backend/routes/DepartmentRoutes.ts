import { Router } from "express";
import type { FilterQuery } from "mongoose";
import Department, { type DepartmentDoc } from "../models/Department";
import Asset from "../models/Asset";
import { AuthedRequestHandler } from "../types/http";
import { requireAuth } from "../middleware/authMiddleware";
import { departmentValidators } from "../validators/departmentValidators";
import { validate } from "../middleware/validationMiddleware";

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

// POST /api/departments/:deptId/lines
const addLine: AuthedRequestHandler<{ deptId: string }> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const doc = await Department.findOneAndUpdate(
      filter,
      {
        $push: {
          lines: { ...req.body, tenantId: req.tenantId },
        },
      },
      { new: true, runValidators: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

// PUT /api/departments/:deptId/lines/:lineId
const updateLine: AuthedRequestHandler<{ deptId: string; lineId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
      "lines._id": req.params.lineId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body)) {
      set[`lines.$.${key}`] = value;
    }
    const doc = await Department.findOneAndUpdate(
      filter,
      { $set: set },
      { new: true, runValidators: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/departments/:deptId/lines/:lineId
const deleteLine: AuthedRequestHandler<{ deptId: string; lineId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
      "lines._id": req.params.lineId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const doc = await Department.findOneAndUpdate(
      filter,
      { $pull: { lines: { _id: req.params.lineId } } },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/departments/:deptId/lines/:lineId/stations
const addStation: AuthedRequestHandler<{
  deptId: string;
  lineId: string;
}> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
      "lines._id": req.params.lineId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const doc = await Department.findOneAndUpdate(
      filter,
      { $push: { "lines.$.stations": req.body } },
      { new: true, runValidators: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

// PUT /api/departments/:deptId/lines/:lineId/stations/:stationId
const updateStation: AuthedRequestHandler<{
  deptId: string;
  lineId: string;
  stationId: string;
}> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
      "lines._id": req.params.lineId,
      "lines.stations._id": req.params.stationId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body)) {
      set[`lines.$[line].stations.$[station].${key}`] = value;
    }
    const doc = await Department.findOneAndUpdate(
      filter,
      { $set: set },
      {
        new: true,
        runValidators: true,
        arrayFilters: [
          { "line._id": req.params.lineId },
          { "station._id": req.params.stationId },
        ],
      },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/departments/:deptId/lines/:lineId/stations/:stationId
const deleteStation: AuthedRequestHandler<{
  deptId: string;
  lineId: string;
  stationId: string;
}> = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      _id: req.params.deptId,
      tenantId: req.tenantId,
      "lines._id": req.params.lineId,
      "lines.stations._id": req.params.stationId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const doc = await Department.findOneAndUpdate(
      filter,
      {
        $pull: { "lines.$[line].stations": { _id: req.params.stationId } },
      },
      {
        new: true,
        arrayFilters: [{ "line._id": req.params.lineId }],
      },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
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
router.post("/:deptId/lines", addLine);
router.put("/:deptId/lines/:lineId", updateLine);
router.delete("/:deptId/lines/:lineId", deleteLine);
router.post("/:deptId/lines/:lineId/stations", addStation);
router.put(
  "/:deptId/lines/:lineId/stations/:stationId",
  updateStation,
);
router.delete(
  "/:deptId/lines/:lineId/stations/:stationId",
  deleteStation,
);

export default router;
