/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response } from 'express';
import { ok, fail, asyncHandler } from '../src/lib/http';

import Tenant from '../models/Tenant';

export const getAllTenants = asyncHandler(async (_req: Request, res: Response) => {
  const tenants = await Tenant.find();
  ok(res, tenants);
});

export const getTenantById = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) return fail(res, 'Not found', 404);
  ok(res, tenant);
});

export const createTenant = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const tenant = await Tenant.create(req.body);
  ok(res, tenant, 201);
});

export const updateTenant = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!tenant) return fail(res, 'Not found', 404);
  ok(res, tenant);
});

export const deleteTenant = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const tenant = await Tenant.findByIdAndDelete(req.params.id);
  if (!tenant) return fail(res, 'Not found', 404);
  ok(res, { message: 'Deleted successfully' });
});

export default {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
};
