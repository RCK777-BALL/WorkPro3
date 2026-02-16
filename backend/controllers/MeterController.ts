/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthedRequestHandler } from '../types/http';
import Meter, { type MeterDocument } from '../models/Meter';
import MeterReading, { type MeterReadingDocument } from '../models/MeterReading';
import { type UpdateQuery, type FilterQuery } from 'mongoose';
import { writeAuditLog, toEntityId, sendResponse, handleControllerError } from '../utils';

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
    const tenantId = toEntityId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const assetQuery = req.query.asset;
    if (typeof assetQuery === 'string') {
      const assetId = toEntityId(assetQuery);
      if (assetId) {
        filter.asset = assetId;
      }
    }

    const meters = await Meter.find(filter).exec();
    sendResponse(res, meters);
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};

export const getMeterById: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    const meterId = toEntityId(req.params.id);

    if (!tenantId || !meterId) {
      sendResponse(res, null, 'Invalid identifier', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { _id: meterId, tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const meter = (await Meter.findOne(filter).exec()) as MeterDocument | null;
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, meter);
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};

export const createMeter: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterBody
> = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const body = req.body;
    const assetId = toEntityId(body.asset);
    if (!assetId) {
      sendResponse(res, null, 'Asset ID required', 400);
      return;
    }
    const siteId = toEntityId(req.siteId);

    const meter = (await Meter.create({
      asset: assetId,
      name: body.name,
      unit: body.unit,
      currentValue: body.currentValue ?? 0,
      pmInterval: body.pmInterval,
      lastWOValue: body.lastWOValue ?? 0,
      tenantId,
      ...(siteId ? { siteId } : {}),
    })) as MeterDocument;
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
    handleControllerError(res, err, next);
    return;
  }
};

export const updateMeter: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterUpdateBody
> = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const meterId = toEntityId(req.params.id);
    if (!meterId) {
      sendResponse(res, null, 'Invalid identifier', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { _id: meterId, tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const existing = (await Meter.findOne(filter).exec()) as MeterDocument | null;
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const meter = (await Meter.findOneAndUpdate(
      filter,
      (req.body ?? {}) as UpdateQuery<MeterUpdateBody>,
      { returnDocument: 'after' },
    ).exec()) as MeterDocument | null;
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    await writeAuditLog({
      tenantId,
      ...(userId ? { userId } : {}),
      action: 'update',
      entityType: 'Meter',
      entityId: meterId,
      before: existing.toObject(),
      after: meter?.toObject(),
    });
    sendResponse(res, meter);
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};

export const deleteMeter: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const meterId = toEntityId(req.params.id);
    if (!meterId) {
      sendResponse(res, null, 'Invalid identifier', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { _id: meterId, tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const meter = (await Meter.findOneAndDelete(filter).exec()) as MeterDocument | null;
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
      entityId: meterId,
      before: meter.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};

export const addMeterReading: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  MeterReadingBody
> = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const meterId = toEntityId(req.params.id);
    if (!meterId) {
      sendResponse(res, null, 'Invalid identifier', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { _id: meterId, tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const meter = (await Meter.findOne(filter).exec()) as MeterDocument | null;
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const reading = (await MeterReading.create({
      meter: meter._id,
      value: req.body.value,
      tenantId,
      ...(siteId ? { siteId } : {}),
    })) as MeterReadingDocument;
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
    handleControllerError(res, err, next);
    return;
  }
};

export const getMeterReadings: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = toEntityId(req.tenantId);
    const meterId = toEntityId(req.params.id);

    if (!tenantId || !meterId) {
      sendResponse(res, null, 'Invalid identifier', 400);
      return;
    }

    const filter: FilterQuery<MeterDocument> = { _id: meterId, tenantId };

    const siteId = toEntityId(req.siteId);
    if (siteId) {
      filter.siteId = siteId;
    }

    const meter = (await Meter.findOne(filter).exec()) as MeterDocument | null;
    if (!meter) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const readingFilter: FilterQuery<MeterReadingDocument> = {
      meter: meter._id,
      tenantId,
    };
    if (siteId) {
      readingFilter.siteId = siteId;
    }
    const readings = await MeterReading.find(readingFilter)
      .sort({ timestamp: -1 })
      .limit(100)
      .exec();
    sendResponse(res, readings);
    return;
  } catch (err) {
    handleControllerError(res, err, next);
    return;
  }
};

