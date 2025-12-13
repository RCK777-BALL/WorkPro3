/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';
import type { ParsedQs } from 'qs';
import type { ParamsDictionary } from 'express-serve-static-core';

import Department, { type DepartmentDoc } from '../models/Department';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils';


interface DepartmentListQuery extends ParsedQs {
  q?: string;
}

type DepartmentListResponse = DepartmentDoc[];

const normalizeSearchTerm = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const buildDepartmentFilter = (
  tenantId: string,
  options: { siteId?: string | undefined; search?: string | undefined },
): FilterQuery<DepartmentDoc> => {
  const filter: FilterQuery<DepartmentDoc> = { tenantId };

  if (options.siteId) {
    filter.siteId = options.siteId;
  }

  if (options.search) {
    filter.name = { $regex: new RegExp(options.search, 'i') };
  }

  return filter;
};


const listDepartments: AuthedRequestHandler<
  ParamsDictionary,
  DepartmentListResponse,
  unknown,
  DepartmentListQuery
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const search = normalizeSearchTerm(req.query?.q);

    const filter = buildDepartmentFilter(tenantId, {
      siteId: req.siteId,
      search,
    });

    const items = await Department.find(filter).sort({ name: 1 });
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export { listDepartments };

