/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import { writeAuditLog } from '../utils/audit';
import { Types, UpdateQuery } from 'mongoose';


export const getMeters: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    if (req.query.asset) filter.asset = req.query.asset;
    const meters = await Meter.find(filter);
    res.json(meters);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getMeterById: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(meter);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const meter = await Meter.create({
      ...req.body,
      tenantId,
      siteId: req.siteId,
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Meter',
      entityId: meter._id,
      after: meter.toObject(),
    });
    res.status(201).json(meter);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const existing = await Meter.findOne(filter);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const meter = await Meter.findOneAndUpdate(
      filter,
      req.body as UpdateQuery<Record<string, unknown>>,
      { new: true }
    );
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Meter',
      entityId: new Types.ObjectId(req.params.id),
      before: existing.toObject(),
      after: meter?.toObject(),
    });
    res.json(meter);
    return;
  } catch (err) {
    return next(err);
  }
};

export const deleteMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOneAndDelete(filter);
    if (!meter) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Meter',
      entityId: new Types.ObjectId(req.params.id),
      before: meter.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};

export const addMeterReading: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const reading = await MeterReading.create({
      meter: meter._id,
      value: req.body.value,
      tenantId,
      siteId: req.siteId,
    });
    meter.currentValue = req.body.value;
    await meter.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'addReading',
      entityType: 'Meter',
      entityId: meter._id,
      after: meter.toObject(),
    });
    res.status(201).json(reading);
    return;
  } catch (err) {
    return next(err);
  }
};

export const getMeterReadings: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const readingFilter: any = { meter: meter._id, tenantId: req.tenantId };
    if (req.siteId) readingFilter.siteId = req.siteId;
    const readings = await MeterReading.find(readingFilter)
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(readings);
    return;
  } catch (err) {
    return next(err);
  }
};

