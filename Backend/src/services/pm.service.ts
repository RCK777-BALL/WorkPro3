/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PreventiveMaintenance from '../models/PreventiveMaintenance';
import type {
  PreventiveMaintenanceInput,
  PreventiveMaintenanceUpdateInput,
} from '../../../shared/validators/preventiveMaintenance';

export interface PMListResult {
  items: unknown[];
  total: number;
}

const buildRule = (schedule: PreventiveMaintenanceInput['schedule']) => {
  if (schedule.cadenceType === 'meter') {
    return {
      type: 'meter',
      meterName: schedule.meterUnit,
      threshold: schedule.cadenceValue,
    };
  }

  const intervalDays = Math.max(1, Math.floor(schedule.cadenceValue));
  return {
    type: 'calendar',
    cron: `0 0 */${intervalDays} * *`,
  };
};

export const listPreventiveMaintenance = async (tenantId: string): Promise<PMListResult> => {
  const items = await PreventiveMaintenance.find({ tenantId: new Types.ObjectId(tenantId) })
    .sort({ updatedAt: -1 })
    .lean();
  const total = await PreventiveMaintenance.countDocuments({ tenantId: new Types.ObjectId(tenantId) });
  return { items, total };
};

export const getPreventiveMaintenance = async (tenantId: string, id: string) =>
  PreventiveMaintenance.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) }).lean();

export const createPreventiveMaintenance = async (tenantId: string, input: PreventiveMaintenanceInput) => {
  const rule = buildRule(input.schedule);
  const assignments = input.assetIds.map((assetId: string) => ({
    asset: new Types.ObjectId(assetId),
    trigger: { type: input.schedule.cadenceType },
    nextDue: input.nextRunAt ? new Date(input.nextRunAt) : undefined,
  }));

  const doc = await PreventiveMaintenance.create({
    title: input.title,
    notes: input.description,
    tenantId: new Types.ObjectId(tenantId),
    rule,
    active: input.active ?? true,
    assignments,
  });

  return doc.toObject();
};

export const updatePreventiveMaintenance = async (
  tenantId: string,
  id: string,
  input: PreventiveMaintenanceUpdateInput,
) => {
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.notes = input.description;
  if (input.active !== undefined) patch.active = input.active;
  if (input.schedule) patch.rule = buildRule(input.schedule);
  if (input.assetIds) {
    patch.assignments = input.assetIds.map((assetId: string) => ({
      asset: new Types.ObjectId(assetId),
      trigger: { type: input.schedule?.cadenceType ?? 'time' },
      nextDue: input.nextRunAt ? new Date(input.nextRunAt) : undefined,
    }));
  }

  const updated = await PreventiveMaintenance.findOneAndUpdate(
    { _id: id, tenantId: new Types.ObjectId(tenantId) },
    { $set: patch },
    { returnDocument: 'after' },
  ).lean();

  return updated;
};

export const deletePreventiveMaintenance = async (tenantId: string, id: string) => {
  await PreventiveMaintenance.deleteOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
};
