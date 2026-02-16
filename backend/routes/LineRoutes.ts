/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import type { FilterQuery, Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { validate } from '../middleware/validationMiddleware';
import Line, { type LineDoc } from '../models/Line';
import Department from '../models/Department';
import Station from '../models/Station';
import Asset from '../models/Asset';
import type { AuthedRequestHandler } from '../types/http';
import { lineUpdateValidators, lineValidators } from '../validators/lineValidators';
import sendResponse from '../utils/sendResponse';

type LineLike = {
  _id: Types.ObjectId;
  name: string;
  departmentId: Types.ObjectId;
  tenantId: Types.ObjectId;
  plant?: Types.ObjectId | null;
  siteId?: Types.ObjectId | null;
  notes?: string | null;
  stations: Types.ObjectId[] | Types.Array<Types.ObjectId>;
};

const toLinePayload = (line: LineLike) => ({
  _id: line._id.toString(),
  name: line.name,
  departmentId: line.departmentId.toString(),
  tenantId: line.tenantId.toString(),
  plant: line.plant ? line.plant.toString() : undefined,
  siteId: line.siteId ? line.siteId.toString() : undefined,
  notes: line.notes ?? '',
  stations: Array.from(line.stations ?? []).map((station) => station.toString()),
});

const router = Router();
router.use(requireAuth);
router.use(tenantScope);

const lineValidationHandlers = lineValidators as unknown as RequestHandler[];
const lineUpdateValidationHandlers = lineUpdateValidators as unknown as RequestHandler[];

const resolvePlantId = (req: { plantId?: string | undefined; siteId?: string | undefined }): string | undefined =>
  req.plantId ?? req.siteId ?? undefined;

const listLines: AuthedRequestHandler<Record<string, string>, unknown> = async (req, res, next) => {
  try {
    const filter: FilterQuery<LineDoc> = { tenantId: req.tenantId };
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId as any;
    }
    const plantId = resolvePlantId(req);
    if (plantId) {
      filter.plant = plantId as any;
    }
    if (req.siteId) {
      filter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    const lines = await Line.find(filter).sort({ name: 1 }).lean();
    const payload = lines.map((line) => toLinePayload(line as unknown as LineDoc));
    sendResponse(res, payload, null, 200, 'Lines retrieved');
  } catch (err) {
    next(err);
  }
};

const getLine: AuthedRequestHandler<
  { id: string },
  LineDoc | { message: string }
> = async (req, res, next) => {
  try {
    const query: FilterQuery<LineDoc> = { _id: req.params.id, tenantId: req.tenantId };
    const plantId = resolvePlantId(req);
    if (plantId) {
      query.plant = plantId as any;
    }
    const line = await Line.findOne(query);
    if (!line) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, toLinePayload(line), null, 200, 'Line retrieved');
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
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const department = await Department.findOne({
      _id: req.body.departmentId,
      tenantId: req.tenantId,
    });
    if (!department) {
      sendResponse(res, null, 'Department not found', 404);
      return;
    }
    const plantId = resolvePlantId(req);
    if (!plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    if (department.plant && department.plant.toString() !== plantId) {
      sendResponse(res, null, 'Department belongs to a different plant', 403);
      return;
    }
    const line = await Line.create({
      name: req.body.name,
      notes: req.body.notes ?? '',
      departmentId: department._id,
      tenantId: req.tenantId,
      siteId: department.siteId ?? req.siteId,
      plant: plantId as any,
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

    sendResponse(res, toLinePayload(line), null, 201, 'Line created');
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
      sendResponse(res, null, 'No updates provided', 400);
      return;
    }
    const plantId = resolvePlantId(req);
    const query: FilterQuery<LineDoc> = { _id: req.params.id, tenantId: req.tenantId };
    if (plantId) {
      query.plant = plantId as any;
    }
    const line = await Line.findOneAndUpdate(
      query,
      { $set: update },
      { returnDocument: 'after' },
    );
    if (!line) {
      sendResponse(res, null, 'Not found', 404);
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

    sendResponse(res, toLinePayload(line), null, 200, 'Line updated');
  } catch (err) {
    next(err);
  }
};

const deleteLine: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const plantId = resolvePlantId(req);
    const query: FilterQuery<LineDoc> = { _id: req.params.id, tenantId: req.tenantId };
    if (plantId) {
      query.plant = plantId as any;
    }
    const line = await Line.findOne(query);
    if (!line) {
      sendResponse(res, null, 'Not found', 404);
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

    sendResponse(res, { id: line._id.toString() }, null, 200, 'Line deleted');
  } catch (err) {
    next(err);
  }
};

router.get('/', listLines);
router.get('/:id', getLine);
router.post('/', ...lineValidationHandlers, validate, createLine);
router.put('/:id', ...lineUpdateValidationHandlers, validate, updateLine);
router.delete('/:id', deleteLine);

export { listLines, getLine, createLine, updateLine, deleteLine };
export default router;
