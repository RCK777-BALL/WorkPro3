/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import { writeAuditLog } from '../utils/audit';
import { Document, Types, UpdateQuery } from 'mongoose';
import { sendResponse } from '../utils/sendResponse';


export const getMeters: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    if (req.query.asset) filter.asset = req.query.asset;
    const meters = await Meter.find(filter);
    sendResponse(res, meters);
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
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, meter);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
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
    sendResponse(res, meter, null, 201);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const existing = await Meter.findOne(filter);
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const meter = await Meter.findOneAndUpdate(
      filter,
      req.body as UpdateQuery<Document>,
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
    sendResponse(res, meter);
    return;
  } catch (err) {
    return next(err);
  }
};

export const deleteMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOneAndDelete(filter);
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
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
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};

export const addMeterReading: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
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
    sendResponse(res, reading, null, 201);
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
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readingFilter: any = { meter: meter._id, tenantId: req.tenantId };
    if (req.siteId) readingFilter.siteId = req.siteId;
    const readings = await MeterReading.find(readingFilter)
      .sort({ timestamp: -1 })
      .limit(100);
    sendResponse(res, readings);
    return;
  } catch (err) {
    return next(err);
  }
};

