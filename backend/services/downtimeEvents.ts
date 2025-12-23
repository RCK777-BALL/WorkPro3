/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, UpdateWriteOpResult } from 'mongoose';
import { Types } from 'mongoose';
import DowntimeEvent, { type DowntimeEventDocument } from '../models/DowntimeEvent';

const FAR_FUTURE = new Date('9999-12-31T23:59:59.999Z');

export type DowntimeEventPayload = Pick<
  DowntimeEventDocument,
  'assetId' | 'workOrderId' | 'start' | 'end' | 'causeCode' | 'reason' | 'impactMinutes'
>;

export type DowntimeEventFilters = Partial<{
  assetId: Types.ObjectId | string;
  workOrderId: Types.ObjectId | string;
  activeOnly: boolean;
}>;

const toObjectId = (value?: Types.ObjectId | string): Types.ObjectId | undefined =>
  value ? new Types.ObjectId(value) : undefined;

const buildOverlapQuery = (
  tenantId: string,
  assetId: Types.ObjectId,
  start: Date,
  end?: Date,
  excludeId?: Types.ObjectId,
): FilterQuery<DowntimeEventDocument> => {
  const query: FilterQuery<DowntimeEventDocument> = {
    tenantId,
    assetId,
    start: { $lt: end ?? FAR_FUTURE },
    $or: [{ end: { $exists: false } }, { end: { $gt: start } }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId } as any;
  }

  return query;
};

const assertNoOverlap = async (
  tenantId: string,
  assetId: Types.ObjectId,
  start: Date,
  end?: Date,
  excludeId?: Types.ObjectId,
) => {
  const overlap = await DowntimeEvent.exists(buildOverlapQuery(tenantId, assetId, start, end, excludeId)).lean();
  if (overlap) {
    throw new Error('Downtime events may not overlap for the same asset');
  }
};

const assertRequiredFields = (payload: DowntimeEventPayload) => {
  if (!payload.causeCode?.trim() || !payload.reason?.trim()) {
    throw new Error('Cause code and reason are required');
  }
};

export const listDowntimeEvents = async (
  tenantId: string,
  filters: DowntimeEventFilters = {},
): Promise<DowntimeEventDocument[]> => {
  const query: FilterQuery<DowntimeEventDocument> = { tenantId };

  if (filters.assetId) query.assetId = toObjectId(filters.assetId);
  if (filters.workOrderId) query.workOrderId = toObjectId(filters.workOrderId);
  if (filters.activeOnly) query.end = { $exists: false } as any;

  return DowntimeEvent.find(query).sort({ start: -1 }).exec();
};

export const createDowntimeEvent = async (
  tenantId: string,
  payload: DowntimeEventPayload,
): Promise<DowntimeEventDocument> => {
  assertRequiredFields(payload);
  const assetId = toObjectId(payload.assetId) as Types.ObjectId;
  const doc = new DowntimeEvent({ ...payload, tenantId, assetId });

  await assertNoOverlap(tenantId, assetId, payload.start, payload.end);

  return doc.save();
};

export const updateDowntimeEvent = async (
  tenantId: string,
  id: string,
  payload: Partial<DowntimeEventPayload>,
): Promise<DowntimeEventDocument | null> => {
  const event = await DowntimeEvent.findOne({ _id: id, tenantId });
  if (!event) return null;

  const nextAssetId = payload.assetId ? toObjectId(payload.assetId) ?? event.assetId : event.assetId;
  if (payload.assetId) event.assetId = nextAssetId;
  if (payload.workOrderId !== undefined) event.workOrderId = toObjectId(payload.workOrderId);
  if (payload.start !== undefined) event.start = payload.start;
  if (payload.end !== undefined) event.end = payload.end;
  if (payload.causeCode !== undefined) event.causeCode = payload.causeCode;
  if (payload.reason !== undefined) event.reason = payload.reason;
  if (payload.impactMinutes !== undefined) event.impactMinutes = payload.impactMinutes;

  assertRequiredFields(event as DowntimeEventPayload);
  await assertNoOverlap(tenantId, nextAssetId, event.start, event.end, event._id as Types.ObjectId);

  return event.save();
};

export const closeOpenDowntimeEventsForWorkOrder = async (
  tenantId: string,
  workOrderId: Types.ObjectId,
  closedAt: Date,
): Promise<UpdateWriteOpResult> =>
  DowntimeEvent.updateMany(
    { tenantId, workOrderId, end: { $exists: false } },
    { $set: { end: closedAt } },
    { timestamps: false },
  );
