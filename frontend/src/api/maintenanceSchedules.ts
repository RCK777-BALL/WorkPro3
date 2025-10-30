/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { MaintenanceSchedule, RepeatConfig } from '@/types';

type RepeatConfigResponse = {
  interval?: number;
  unit?: RepeatConfig['unit'];
  endDate?: string | null;
  occurrences?: number | null;
};

type MaintenanceScheduleResponse = {
  _id: string;
  title: string;
  description?: string;
  assetId?: string;
  frequency: string;
  nextDue: string;
  estimatedDuration?: number;
  instructions?: string;
  type?: string;
  repeatConfig?: RepeatConfigResponse;
  parts?: string[];
  lastCompleted?: string | null;
  lastCompletedBy?: string;
  assignedTo?: string;
};

export type MaintenanceSchedulePayload = Omit<MaintenanceSchedule, 'id'> & { id?: string };

const toDateOnly = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  return value.split('T')[0];
};

const toRepeatConfig = (value?: RepeatConfigResponse): RepeatConfig => ({
  interval: value?.interval ?? 1,
  unit: (value?.unit ?? 'month') as RepeatConfig['unit'],
  endDate: toDateOnly(value?.endDate),
  occurrences: value?.occurrences ?? undefined,
});

const toMaintenanceSchedule = (value: MaintenanceScheduleResponse): MaintenanceSchedule => ({
  id: value._id,
  title: value.title,
  description: value.description ?? '',
  assetId: value.assetId ?? '',
  frequency: value.frequency,
  nextDue: toDateOnly(value.nextDue) ?? '',
  estimatedDuration: value.estimatedDuration ?? 0,
  instructions: value.instructions ?? '',
  type: value.type ?? 'preventive',
  repeatConfig: toRepeatConfig(value.repeatConfig),
  parts: value.parts ?? [],
  lastCompleted: toDateOnly(value.lastCompleted),
  lastCompletedBy: value.lastCompletedBy ?? undefined,
  assignedTo: value.assignedTo ?? undefined,
});

const serializeRepeatConfig = (config: RepeatConfig): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    interval: config.interval,
    unit: config.unit,
  };

  if (config.endDate) {
    payload.endDate = config.endDate;
  }

  if (config.occurrences && config.occurrences > 0) {
    payload.occurrences = config.occurrences;
  }

  return payload;
};

const serializePayload = (schedule: MaintenanceSchedulePayload): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    title: schedule.title,
    description: schedule.description,
    assetId: schedule.assetId,
    frequency: schedule.frequency,
    nextDue: schedule.nextDue,
    estimatedDuration: schedule.estimatedDuration,
    instructions: schedule.instructions,
    type: schedule.type,
    repeatConfig: serializeRepeatConfig(schedule.repeatConfig),
    parts: schedule.parts,
  };

  if (schedule.lastCompleted) {
    payload.lastCompleted = schedule.lastCompleted;
  }

  if (schedule.lastCompletedBy) {
    payload.lastCompletedBy = schedule.lastCompletedBy;
  }

  if (schedule.assignedTo) {
    payload.assignedTo = schedule.assignedTo;
  }

  return payload;
};

export const fetchMaintenanceSchedules = async (): Promise<MaintenanceSchedule[]> => {
  const response = await http.get<MaintenanceScheduleResponse[]>(
    '/maintenance-schedules',
  );
  return response.data.map(toMaintenanceSchedule);
};

export const createMaintenanceSchedule = async (
  schedule: MaintenanceSchedulePayload,
): Promise<MaintenanceSchedule> => {
  const response = await http.post<MaintenanceScheduleResponse>(
    '/maintenance-schedules',
    serializePayload(schedule),
  );
  return toMaintenanceSchedule(response.data);
};

export const updateMaintenanceSchedule = async (
  id: string,
  schedule: MaintenanceSchedulePayload,
): Promise<MaintenanceSchedule> => {
  const response = await http.put<MaintenanceScheduleResponse>(
    `/maintenance-schedules/${id}`,
    serializePayload(schedule),
  );
  return toMaintenanceSchedule(response.data);
};

export const deleteMaintenanceSchedule = (id: string) =>
  http.delete(`/maintenance-schedules/${id}`);
