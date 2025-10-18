/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { FilterQuery } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import Station, { type StationDoc } from '../models/Station';
import Line from '../models/Line';
import Department from '../models/Department';
import Asset from '../models/Asset';
import type { AuthedRequestHandler } from '../types/http';
import { stationUpdateValidators, stationValidators } from '../validators/stationValidators';

const router = Router();
router.use(requireAuth);

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
    if (req.siteId) {
      filter.$or = [
        { siteId: req.siteId },
        { siteId: null },
        { siteId: { $exists: false } },
      ];
    }
    const stations = await Station.find(filter).sort({ name: 1 }).lean();
    res.json(
      stations.map((station) => ({
        _id: station._id.toString(),
        name: station.name,
        notes: station.notes ?? '',
        lineId: station.lineId.toString(),
        departmentId: station.departmentId.toString(),
        tenantId: station.tenantId.toString(),
        siteId: station.siteId ? station.siteId.toString() : undefined,
      })),
    );
  } catch (err) {
    next(err);
  }
};

const getStation: AuthedRequestHandler<
  { id: string },
  StationDoc | { message: string }
> = async (req, res, next) => {
  try {
    const station = await Station.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!station) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(station);
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
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const line = await Line.findOne({ _id: req.body.lineId, tenantId: req.tenantId });
    if (!line) {
      res.status(404).json({ message: 'Line not found' });
      return;
    }
    const station = await Station.create({
      name: req.body.name,
      notes: req.body.notes ?? '',
      lineId: line._id,
      departmentId: line.departmentId,
      tenantId: req.tenantId,
      siteId: line.siteId ?? req.siteId,
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

    res.status(201).json(station);
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
      res.status(400).json({ message: 'No updates provided' });
      return;
    }
    const station = await Station.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: update },
      { new: true },
    );
    if (!station) {
      res.status(404).json({ message: 'Not found' });
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

    res.json(station);
  } catch (err) {
    next(err);
  }
};

const deleteStation: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const station = await Station.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!station) {
      res.status(404).json({ message: 'Not found' });
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

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

router.get('/', listStations);
router.get('/:id', getStation);
router.post('/', stationValidators, validate, createStation);
router.put('/:id', stationUpdateValidators, validate, updateStation);
router.delete('/:id', deleteStation);

export { listStations, getStation, createStation, updateStation, deleteStation };
export default router;
