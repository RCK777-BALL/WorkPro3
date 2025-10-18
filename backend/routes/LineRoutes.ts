/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { FilterQuery } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import Line, { type LineDoc } from '../models/Line';
import Department from '../models/Department';
import Station from '../models/Station';
import Asset from '../models/Asset';
import type { AuthedRequestHandler } from '../types/http';
import { lineUpdateValidators, lineValidators } from '../validators/lineValidators';

const router = Router();
router.use(requireAuth);

const listLines: AuthedRequestHandler<Record<string, string>, unknown> = async (req, res, next) => {
  try {
    const filter: FilterQuery<LineDoc> = { tenantId: req.tenantId };
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId as any;
    }
    if (req.siteId) {
      filter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    const lines = await Line.find(filter).sort({ name: 1 }).lean();
    res.json(
      lines.map((line) => ({
        _id: line._id.toString(),
        name: line.name,
        departmentId: line.departmentId.toString(),
        tenantId: line.tenantId.toString(),
        siteId: line.siteId ? line.siteId.toString() : undefined,
        notes: line.notes ?? '',
        stations: line.stations.map((station) => station.toString()),
      })),
    );
  } catch (err) {
    next(err);
  }
};

const getLine: AuthedRequestHandler<
  { id: string },
  LineDoc | { message: string }
> = async (req, res, next) => {
  try {
    const line = await Line.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(line);
  } catch (err) {
    next(err);
  }
};

const createLine: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  { name: string; departmentId: string; notes?: string }
> = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const department = await Department.findOne({
      _id: req.body.departmentId,
      tenantId: req.tenantId,
    });
    if (!department) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }
    const line = await Line.create({
      name: req.body.name,
      notes: req.body.notes ?? '',
      departmentId: department._id,
      tenantId: req.tenantId,
      siteId: department.siteId ?? req.siteId,
    });

    await Department.updateOne(
      { _id: department._id, tenantId: req.tenantId },
      {
        $push: {
          lines: {
            _id: line._id,
            name: line.name,
            notes: line.notes ?? '',
            tenantId: req.tenantId,
            stations: [],
          },
        },
      },
    );

    res.status(201).json(line);
  } catch (err) {
    next(err);
  }
};

const updateLine: AuthedRequestHandler<
  { id: string },
  LineDoc | { message: string },
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const update: Record<string, unknown> = {};
    if (typeof req.body.name === 'string') {
      update.name = req.body.name;
    }
    if (typeof req.body.notes === 'string') {
      update.notes = req.body.notes;
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ message: 'No updates provided' });
      return;
    }
    const line = await Line.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: update },
      { new: true },
    );
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await Department.updateOne(
      { _id: line.departmentId, tenantId: req.tenantId, 'lines._id': line._id },
      {
        $set: {
          ...(update.name ? { 'lines.$.name': line.name } : {}),
          ...(update.notes ? { 'lines.$.notes': line.notes ?? '' } : {}),
        },
      },
    );

    res.json(line);
  } catch (err) {
    next(err);
  }
};

const deleteLine: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const line = await Line.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!line) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const stations = await Station.find({
      lineId: line._id,
      tenantId: req.tenantId,
    }).select({ _id: 1 });
    const stationIds = stations.map((station) => station._id);

    if (stationIds.length) {
      await Station.deleteMany({ _id: { $in: stationIds } });
      await Asset.updateMany(
        { stationId: { $in: stationIds } },
        { $unset: { stationId: '', lineId: '' } },
      );
    }

    await Line.deleteOne({ _id: line._id });
    await Department.updateOne(
      { _id: line.departmentId, tenantId: req.tenantId },
      { $pull: { lines: { _id: line._id } } },
    );

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

router.get('/', listLines);
router.get('/:id', getLine);
router.post('/', lineValidators, validate, createLine);
router.put('/:id', lineUpdateValidators, validate, updateLine);
router.delete('/:id', deleteLine);

export { listLines, getLine, createLine, updateLine, deleteLine };
export default router;
