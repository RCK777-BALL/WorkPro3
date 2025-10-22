/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';

export interface PMTaskParams extends ParamsDictionary {
  id: string;
}

export type PMTaskListResponse = unknown;
export type PMTaskResponse = unknown;
export type PMTaskDeleteResponse = unknown;
export type PMTaskGenerateWOResponse = unknown;

export interface PMTaskCreateBody {
  [key: string]: unknown;
}

export interface PMTaskUpdateBody {
  [key: string]: unknown;
}
