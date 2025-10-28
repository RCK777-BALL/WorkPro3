/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../types/http';
import { Types } from 'mongoose';
import { sendResponse } from '../utils/sendResponse';

import Tenant, { type TenantDocument } from '../models/Tenant';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';

const getAllTenants = async (
  _req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenants = await Tenant.find();
    sendResponse(res, tenants);
  } catch (err) {
    next(err);
  }
};

const getTenantById = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, tenant);
  } catch (err) {
    next(err);
  }
};

const createTenant = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const tenantPayload = req.body as Partial<TenantDocument>;
    const tenant = (await Tenant.create(tenantPayload)) as TenantDocument;
    await writeAuditLog({
      tenantId: tenant._id,
      userId,
      action: 'create',
      entityType: 'Tenant',
      entityId: toEntityId(tenant._id),
      after: tenant.toObject(),
    });
    sendResponse(res, tenant, null, 201);
  } catch (err) {
    next(err);
  }
};

const updateTenant = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return sendResponse(res, null, 'Not found', 404);

    const before = tenant.toObject();
    tenant.set(req.body as Partial<TenantDocument>);
    await tenant.save();
    await writeAuditLog({
      tenantId: tenant._id,
      userId,
      action: 'update',
      entityType: 'Tenant',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after: tenant.toObject(),
    });
    sendResponse(res, tenant);
  } catch (err) {
    next(err);
  }
};

const deleteTenant = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return sendResponse(res, null, 'Not found', 404);
    await writeAuditLog({
      tenantId: tenant._id,
      userId,
      action: 'delete',
      entityType: 'Tenant',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: tenant.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
};
