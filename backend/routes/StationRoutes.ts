/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import type { FilterQuery, Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { validate } from '../middleware/validationMiddleware';
import Station, { type StationDoc } from '../models/Station';
import Line from '../models/Line';
import Department from '../models/Department';
import Asset from '../models/Asset';
import type { AuthedRequestHandler } from '../types/http';
import { stationUpdateValidators, stationValidators } from '../validators/stationValidators';
import sendResponse from '../utils/sendResponse';

type StationLike = {
  _id: Types.ObjectId;
  name: string;
  notes?: string | null;
  lineId: Types.ObjectId;
  departmentId: Types.ObjectId;
  tenantId: Types.ObjectId;
  plant?: Types.ObjectId | null;
  siteId?: Types.ObjectId | null;
};

const toStationPayload = (station: StationLike) => ({
  _id: station._id.toString(),
  name: station.name,
  notes: station.notes ?? '',
  lineId: station.lineId.toString(),
  departmentId: station.departmentId.toString(),
  tenantId: station.tenantId.toString(),
  plant: station.plant ? station.plant.toString() : undefined,
  siteId: station.siteId ? station.siteId.toString() : undefined,
});

const router = Router();
router.use(requireAuth);
router.use(tenantScope);

const stationValidationHandlers = stationValidators as unknown as RequestHandler[];
const stationUpdateValidationHandlers = stationUpdateValidators as unknown as RequestHandler[];

const resolvePlantId = (req: { plantId?: string | undefined; siteId?: string | undefined }): string | undefined =>
  req.plantId ?? req.siteId ?? undefined;

const listStations: AuthedRequestHandler<Record<string, string>, unknown> = async (
  req,
  res,
  next,
) => {
  try {
    const filter: FilterQuery<StationDoc> = { tenantId: req.tenantId };
    if (req.query.lineId) {
      filter.lineId = req.query.lineId as any;
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
    const stations = await Station.find(filter).sort({ name: 1 }).lean();
    const payload = stations.map(
      (station) => toStationPayload(station as unknown as StationDoc),
    );
    sendResponse(res, payload, null, 200, 'Stations retrieved');
  } catch (err) {
    next(err);
  }
};

const getStation: AuthedRequestHandler<
  { id: string },
  StationDoc | { message: string }
> = async (req, res, next) => {
  try {
    const plantId = resolvePlantId(req);
    const query: FilterQuery<StationDoc> = { _id: req.params.id, tenantId: req.tenantId };
    if (plantId) {
      query.plant = plantId as any;
    }
    const station = await Station.findOne(query);
    if (!station) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, toStationPayload(station), null, 200, 'Station retrieved');
  } catch (err) {
    next(err);
  }
};

const createStation: AuthedRequestHandler<
  Record<string, string>,
  unknown,
  { name: string; lineId: string; notes?: string }
> = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const plantId = resolvePlantId(req);
    if (!plantId) {
      sendResponse(res, null, 'Active plant context required', 400);
      return;
    }
    const line = await Line.findOne({ _id: req.body.lineId, tenantId: req.tenantId, plant: plantId as any });
    if (!line) {
      sendResponse(res, null, 'Line not found', 404);
      return;
    }
    const station = await Station.create({
      name: req.body.name,
      notes: req.body.notes ?? '',
      lineId: line._id,
      departmentId: line.departmentId,
      tenantId: req.tenantId,
      siteId: line.siteId ?? req.siteId,
      plant: plantId as any,
    });

    await Line.updateOne(
      { _id: line._id },
      { $addToSet: { stations: station._id } },
    );
    await Department.updateOne(
      { _id: line.departmentId, tenantId: req.tenantId, 'lines._id': line._id },
      {
        $push: {
          'lines.$.stations': {
            _id: station._id,
            name: station.name,
            notes: station.notes ?? '',
            assets: [],
          },
        },
      },
    );

    sendResponse(res, toStationPayload(station), null, 201, 'Station created');
  } catch (err) {
    next(err);
  }
};

const updateStation: AuthedRequestHandler<
  { id: string },
  StationDoc | { message: string },
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
    const query: FilterQuery<StationDoc> = { _id: req.params.id, tenantId: req.tenantId };
    if (plantId) {
      query.plant = plantId as any;
    }
    const station = await Station.findOneAndUpdate(
      query,
      { $set: update },
      { returnDocument: 'after' },
    );
    if (!station) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const setPayload: Record<string, unknown> = {};
    if (update.name) {
      setPayload['lines.$[line].stations.$[station].name'] = station.name;
    }
    if (update.notes) {
      setPayload['lines.$[line].stations.$[station].notes'] = station.notes ?? '';
    }
    if (Object.keys(setPayload).length > 0) {
      await Department.updateOne(
        { _id: station.departmentId, tenantId: req.tenantId },
        { $set: setPayload },
        {
          arrayFilters: [
            { 'line._id': station.lineId },
            { 'station._id': station._id },
          ],
        },
      );
    }

    sendResponse(res, toStationPayload(station), null, 200, 'Station updated');
  } catch (err) {
    next(err);
  }
};

const deleteStation: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const plantId = resolvePlantId(req);
    const query: FilterQuery<StationDoc> = { _id: req.params.id, tenantId: req.tenantId };
    if (plantId) {
      query.plant = plantId as any;
    }
    const station = await Station.findOne(query);
    if (!station) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await Asset.updateMany(
      { stationId: station._id },
      { $unset: { stationId: '', lineId: '' } },
    );

    await Station.deleteOne({ _id: station._id });
    await Line.updateOne(
      { _id: station.lineId },
      { $pull: { stations: station._id } },
    );
    await Department.updateOne(
      { _id: station.departmentId, tenantId: req.tenantId, 'lines._id': station.lineId },
      { $pull: { 'lines.$.stations': { _id: station._id } } },
    );

    sendResponse(res, { id: station._id.toString() }, null, 200, 'Station deleted');
  } catch (err) {
    next(err);
  }
};

router.get('/', listStations);
router.get('/:id', getStation);
router.post('/', ...stationValidationHandlers, validate, createStation);
router.put('/:id', ...stationUpdateValidationHandlers, validate, updateStation);
router.delete('/:id', deleteStation);

export { listStations, getStation, createStation, updateStation, deleteStation };
export default router;
