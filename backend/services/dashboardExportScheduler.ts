/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'crypto';

export type DashboardExportSchedule = {
  id: string;
  format: 'csv' | 'pdf';
  recipients: string[];
  cron: string;
  nextRun: Date;
  status: 'scheduled' | 'disabled';
};

const schedules: DashboardExportSchedule[] = [];

export function scheduleDashboardExport(
  format: 'csv' | 'pdf',
  recipients: string[],
  cron: string,
): DashboardExportSchedule {
  const nextRun = new Date(Date.now() + 60 * 60 * 1000);
  const schedule: DashboardExportSchedule = {
    id: randomUUID(),
    format,
    recipients,
    cron,
    nextRun,
    status: 'scheduled',
  };
  schedules.push(schedule);
  return schedule;
}

export function listDashboardExportSchedules(): DashboardExportSchedule[] {
  return schedules;
}
