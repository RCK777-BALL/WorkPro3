/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { MaintenanceScheduleRepeatUnit } from '../models/MaintenanceSchedule';

export interface MaintenanceScheduleParams extends ParamsDictionary {
  id: string;
}

export interface MaintenanceScheduleBody {
  title: string;
  description?: string | undefined;
  assetId?: string | undefined;
  frequency: string;
  nextDue: string | Date;
  estimatedDuration: number;
  instructions?: string | undefined;
  type: string;
  repeatConfig: {
    interval: number;
    unit: MaintenanceScheduleRepeatUnit;
    endDate?: string | Date | undefined;
    occurrences?: number | undefined;
  };
  parts: string[];
  lastCompleted?: string | Date | undefined;
  lastCompletedBy?: string | undefined;
  assignedTo?: string | undefined;
}

export type MaintenanceScheduleResponse = unknown;
export type MaintenanceSchedulesResponse = unknown;
export type MaintenanceScheduleDeleteResponse = unknown;
