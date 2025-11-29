/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Asset from '../../../models/Asset';
import { toObjectId } from '../../../utils/ids';
import MeterReadingModel, { type MeterReadingDocument } from './model';

export type MeterReadingInput = {
  assetId?: string;
  value?: number;
};

export type MeterReadingResponse = {
  id: string;
  assetId: string;
  value: number;
  createdAt: string;
};

export class MeterReadingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MeterReadingError';
    this.status = status;
  }
}

export type MeterReadingContext = {
  tenantId: string;
  siteId?: string;
};

const toResponse = (doc: MeterReadingDocument): MeterReadingResponse => ({
  id: doc._id.toString(),
  assetId: doc.assetId.toString(),
  value: doc.value,
  createdAt: doc.createdAt.toISOString(),
});

const validateInput = (input: MeterReadingInput) => {
  if (!input.assetId || !Types.ObjectId.isValid(input.assetId)) {
    throw new MeterReadingError('A valid assetId is required', 400);
  }
  if (typeof input.value !== 'number' || Number.isNaN(input.value)) {
    throw new MeterReadingError('A numeric meter value is required', 400);
  }
  if (input.value < 0) {
    throw new MeterReadingError('Meter readings cannot be negative', 400);
  }
};

export const createMeterReading = async (
  context: MeterReadingContext,
  input: MeterReadingInput,
): Promise<MeterReadingResponse> => {
  if (!context.tenantId) {
    throw new MeterReadingError('Tenant context is required', 400);
  }

  validateInput(input);

  const assetId = toObjectId(input.assetId);
  if (!assetId) {
    throw new MeterReadingError('Asset not found', 404);
  }

  const asset = await Asset.findOne({
    _id: assetId,
    tenantId: context.tenantId,
    ...(context.siteId ? { siteId: context.siteId } : {}),
  });

  if (!asset) {
    throw new MeterReadingError('Asset not found', 404);
  }

  const reading = await MeterReadingModel.create({
    assetId,
    value: input.value!,
    tenantId: context.tenantId,
    ...(context.siteId ? { siteId: context.siteId } : {}),
  });

  return toResponse(reading);
};
