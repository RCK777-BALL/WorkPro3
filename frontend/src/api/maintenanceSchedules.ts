/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { MaintenanceSchedule, RepeatConfig } from '@/types';

const isValidDateString = (value?: string) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export type MaintenanceScheduleInput = Omit<MaintenanceSchedule, 'id'> & { id?: string };

const sanitizeRepeatConfig = (config: RepeatConfig) => {
  const interval = Number.isInteger(config.interval) && config.interval > 0 ? config.interval : 1;
  const allowedUnits: RepeatConfig['unit'][] = ['day', 'week', 'month'];
  const unit = allowedUnits.includes(config.unit) ? config.unit : 'month';

  const payload: RepeatConfig & { endDate?: string; occurrences?: number } = {
    interval,
    unit,
  };

  if (isValidDateString(config.endDate)) {
    payload.endDate = config.endDate!;
  }

  if (Number.isInteger(config.occurrences) && (config.occurrences as number) > 0) {
    payload.occurrences = config.occurrences;
  }

  return payload;
};

export const sanitizeSchedulePayload = (schedule: MaintenanceScheduleInput) => {
  const { id, repeatConfig, lastCompleted, lastCompletedBy, assignedTo, parts, ...rest } = schedule;
  void id;

  const estimatedDuration = Number.isFinite(schedule.estimatedDuration)
    ? Math.max(0, schedule.estimatedDuration)
    : 0;

  const partsList = Array.isArray(parts)
    ? parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0).map((part) => part.trim())
    : [];

  return {
    ...rest,
    estimatedDuration,
    nextDue: isValidDateString(schedule.nextDue)
      ? schedule.nextDue
      : new Date().toISOString().split('T')[0],
    repeatConfig: sanitizeRepeatConfig(repeatConfig),
    parts: partsList,
    ...(isValidDateString(lastCompleted) ? { lastCompleted } : {}),
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
