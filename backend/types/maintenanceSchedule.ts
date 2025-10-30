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
  description?: string;
  assetId?: string;
  frequency: string;
  nextDue: string | Date;
  estimatedDuration: number;
  instructions?: string;
  type: string;
  repeatConfig: {
    interval: number;
    unit: MaintenanceScheduleRepeatUnit;
    endDate?: string | Date;
    occurrences?: number;
  };
  parts: string[];
  lastCompleted?: string | Date;
  lastCompletedBy?: string;
  assignedTo?: string;
}

export type MaintenanceScheduleResponse = unknown;
export type MaintenanceSchedulesResponse = unknown;
export type MaintenanceScheduleDeleteResponse = unknown;
