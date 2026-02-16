/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, FlattenMaps, Types } from 'mongoose';

import DowntimeLog, { type DowntimeLogDocument } from '../models/DowntimeLog';

export type LeanDowntimeLog = FlattenMaps<DowntimeLogDocument> & { _id: Types.ObjectId };

export type DowntimeLogFilters = {
  assetId?: string;
  start?: Date;
  end?: Date;
};

export type DowntimeLogPayload = Omit<Pick<DowntimeLogDocument, 'assetId' | 'start' | 'end' | 'reason'>, 'assetId'> & {
  assetId: Types.ObjectId | string;
};

export const listDowntimeLogs = async (
  tenantId: string,
  filters: DowntimeLogFilters = {},
): Promise<LeanDowntimeLog[]> => {
  const query: FilterQuery<DowntimeLogDocument> = { tenantId };

  if (filters.assetId) {
    query.assetId = filters.assetId as any;
  }

  if (filters.start || filters.end) {
    query.start = {} as any;
    if (filters.start) query.start.$gte = filters.start;
    if (filters.end) query.start.$lte = filters.end;
  }

  return DowntimeLog.find(query).sort({ start: -1 }).lean<LeanDowntimeLog[]>().exec();
};

export const createDowntimeLog = async (
  tenantId: string,
  payload: DowntimeLogPayload,
): Promise<DowntimeLogDocument> => {
  const record = new DowntimeLog({ ...payload, tenantId });
  return record.save();
};

export const updateDowntimeLog = async (
  tenantId: string,
  id: string,
  payload: Partial<DowntimeLogPayload>,
): Promise<LeanDowntimeLog | null> =>
  DowntimeLog.findOneAndUpdate({ _id: id, tenantId }, payload, { returnDocument: 'after', runValidators: true })
    .lean<LeanDowntimeLog>()
    .exec();

export const deleteDowntimeLog = async (tenantId: string, id: string): Promise<LeanDowntimeLog | null> =>
  DowntimeLog.findOneAndDelete({ _id: id, tenantId }).lean<LeanDowntimeLog>().exec();

export const getDowntimeLog = async (
  tenantId: string,
  id: string,
): Promise<LeanDowntimeLog | null> =>
  DowntimeLog.findOne({ _id: id, tenantId }).lean<LeanDowntimeLog>().exec();
