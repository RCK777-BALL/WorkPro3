/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { Types } from 'mongoose';

export interface PMTaskParams extends ParamsDictionary {
  id: string;
}

export type PMTaskListResponse = unknown;
export type PMTaskResponse = unknown;
export type PMTaskDeleteResponse = unknown;
export type PMTaskGenerateWOResponse = unknown;

export interface PMTaskCreateBody {
  workOrderTemplateId?: Types.ObjectId | string | null;
  [key: string]: unknown;
}

export interface PMTaskUpdateBody {
  workOrderTemplateId?: Types.ObjectId | string | null;
  [key: string]: unknown;
}
