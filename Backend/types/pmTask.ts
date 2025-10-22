/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { UpdateQuery } from 'mongoose';
import type { AuthedRequest } from './http';
import type { PMTaskDocument } from '../models/PMTask';

export interface PMTaskRequest<P extends ParamsDictionary = ParamsDictionary, ReqBody = unknown>
  extends AuthedRequest<P, unknown, ReqBody> {
  tenantId: string;
  siteId?: string;
  user?: unknown;
}

export interface PMTaskParams extends ParamsDictionary {
  id: string;
}

export type PMTaskListResponse = PMTaskDocument[];
export type PMTaskResponse = PMTaskDocument;
export type PMTaskDeleteResponse = { message: string };
export type PMTaskGenerateWOResponse = { generated: number };
export type PMTaskCreateBody = Partial<PMTaskDocument>;
export type PMTaskUpdateBody = UpdateQuery<PMTaskDocument>;
