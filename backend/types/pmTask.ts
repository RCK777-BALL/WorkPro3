/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { UpdateQuery } from 'mongoose';
import type { AuthedRequest } from './http';
import type { PmTaskDocument } from '../models/PMTask';

export interface PMTaskRequest<P extends ParamsDictionary = ParamsDictionary, ReqBody = unknown>
  extends AuthedRequest<P, unknown, ReqBody> {
  tenantId: string;
  siteId?: string;
  user?: unknown;
}

export interface PMTaskParams {
  id: string;
}

export type PMTaskListResponse = PmTaskDocument[];
export type PMTaskResponse = PmTaskDocument;
export type PMTaskDeleteResponse = { message: string };
export type PMTaskGenerateWOResponse = { generated: number };
export type PMTaskCreateBody = Partial<PmTaskDocument>;
export type PMTaskUpdateBody = UpdateQuery<PmTaskDocument>;
