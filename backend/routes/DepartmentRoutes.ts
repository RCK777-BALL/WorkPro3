import { Router } from "express";
import type { FilterQuery } from "mongoose";
import Department, { type DepartmentDoc } from "../models/Department";
import { AuthedRequestHandler } from "../types/http";
import { requireAuth } from "../middleware/authMiddleware";
import { departmentValidators } from "../validators/departmentValidators";
import { validate } from "../middleware/validationMiddleware";

// GET /api/departments → list by tenantId (+optional siteId)
const listDepartments: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: FilterQuery<DepartmentDoc> & { siteId?: unknown } = {
      tenantId: req.tenantId,
    };
    if (req.siteId) filter.siteId = req.siteId;
    const items = await Department.find(filter).select({
      name: 1,
      lines: 1,
      createdAt: 1,
    });
    return res.json(items);
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

const router = Router();
router.use(requireAuth);
router.get("/", listDepartments);
router.get("/:id", getDepartment);
router.post("/", departmentValidators, validate, createDepartment);
router.put("/:id", departmentValidators, validate, updateDepartment);
router.delete("/:id", deleteDepartment);

export default router;
