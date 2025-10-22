/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthedRequestHandler } from '../types/http';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import { Types, UpdateQuery, Error as MongooseError } from 'mongoose';
import { sendResponse } from '../utils/sendResponse';

interface MeterBody {
  asset: string;
  name: string;
  unit: string;
  currentValue?: number;
  pmInterval: number;
  lastWOValue?: number;
}

type MeterUpdateBody = Partial<MeterBody>;

interface MeterReadingBody {
  value: number;
}

export const getMeters: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    if (req.query.asset) filter.asset = req.query.asset;
    const meters = await Meter.find(filter);
    sendResponse(res, meters);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
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
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
    return next(err);
  }
};

export const createMeter: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const body = req.body;
    const meter = await Meter.create({
      asset: body.asset,
      name: body.name,
      unit: body.unit,
      currentValue: body.currentValue ?? 0,
      pmInterval: body.pmInterval,
      lastWOValue: body.lastWOValue ?? 0,
      tenantId,
      siteId: req.siteId,
    });
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    await writeAuditLog({
      tenantId,
      ...(userId ? { userId } : {}),
      action: 'create',
      entityType: 'Meter',
      entityId: toEntityId(meter._id),
      after: meter.toObject(),
    });
    sendResponse(res, meter, null, 201);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
    return next(err);
  }
};

export const updateMeter: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterUpdateBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const existing = await Meter.findOne(filter);
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const meter = await Meter.findOneAndUpdate(
      filter,
      (req.body ?? {}) as UpdateQuery<MeterUpdateBody>,
      { new: true },
    );
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    await writeAuditLog({
      tenantId,
      ...(userId ? { userId } : {}),
      action: 'update',
      entityType: 'Meter',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: existing.toObject(),
      after: meter?.toObject(),
    });
    sendResponse(res, meter);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
    return next(err);
  }
};

export const deleteMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const filter: any = { _id: req.params.id, tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOneAndDelete(filter);
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    await writeAuditLog({
      tenantId,
      ...(userId ? { userId } : {}),
      action: 'delete',
      entityType: 'Meter',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: meter.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
    return next(err);
  }
};

export const addMeterReading: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterReadingBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
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
      const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
      await writeAuditLog({
        tenantId,
        ...(userId ? { userId } : {}),
        action: 'addReading',
        entityType: 'Meter',
      entityId: toEntityId(meter._id),
      after: meter.toObject(),
    });
    sendResponse(res, reading, null, 201);
    return;
  } catch (err) {
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
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
    if (err instanceof MongooseError.ValidationError) {
      const verr = err as MongooseError.ValidationError;
      sendResponse(
        res,
        null,
        { errors: Object.values(verr.errors).map((e) => e.message) },
        400,
      );
      return;
    }
    return next(err);
  }
};

