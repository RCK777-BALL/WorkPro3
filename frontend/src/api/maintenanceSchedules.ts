/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { MaintenanceSchedule, RepeatConfig } from '@/types';

export type MaintenanceScheduleInput = Omit<MaintenanceSchedule, 'id'> & { id?: string };

const sanitizeRepeatConfig = (config: RepeatConfig) => {
  const payload: RepeatConfig & { endDate?: string; occurrences?: number } = {
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

const sanitizeSchedulePayload = (schedule: MaintenanceScheduleInput) => {
  const { id: _id, repeatConfig, lastCompleted, lastCompletedBy, assignedTo, parts, ...rest } = schedule;

  return {
    ...rest,
    nextDue: schedule.nextDue,
    repeatConfig: sanitizeRepeatConfig(repeatConfig),
    parts: parts ?? [],
    ...(lastCompleted ? { lastCompleted } : {}),
    ...(lastCompletedBy?.trim() ? { lastCompletedBy: lastCompletedBy.trim() } : {}),
    ...(assignedTo?.trim() ? { assignedTo: assignedTo.trim() } : {}),
  };
};

export const getMaintenanceSchedules = () =>
  http.get<MaintenanceSchedule[]>('/maintenance-schedules').then((res) => res.data);

export const createMaintenanceSchedule = (schedule: MaintenanceScheduleInput) =>
  http
    .post<MaintenanceSchedule>('/maintenance-schedules', sanitizeSchedulePayload(schedule))
    .then((res) => res.data);

export const updateMaintenanceSchedule = (id: string, schedule: MaintenanceScheduleInput) =>
  http
    .put<MaintenanceSchedule>(`/maintenance-schedules/${id}`, sanitizeSchedulePayload(schedule))
    .then((res) => res.data);

export const deleteMaintenanceSchedule = (id: string) =>
  http.delete<void>(`/maintenance-schedules/${id}`).then(() => undefined);
