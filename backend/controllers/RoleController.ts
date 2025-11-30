/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import Role from '../models/Role';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';
import { toObjectId, toEntityId } from '../utils/ids';

const buildScopedFilter = (tenantId: Types.ObjectId, siteId?: Types.ObjectId | null) => {
  const filter: Record<string, unknown> = { tenantId };

  if (siteId) {
    filter.$or = [{ siteId: { $exists: false } }, { siteId: null }, { siteId }];
  }

  return filter;
};

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const siteId = toObjectId(req.siteId);
    const roles = await Role.find(buildScopedFilter(tenantId, siteId));
    sendResponse(res, roles);
  } catch (err) {
    next(err);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const { id } = req.params;
    const roleId = toObjectId(id);
    if (!roleId) {
      return sendResponse(res, null, 'Invalid id', 400);
    }
    const role = await Role.findOne({ _id: roleId, ...buildScopedFilter(tenantId, toObjectId(req.siteId)) });
    if (!role) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, role);
  } catch (err) {
    next(err);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const rawUserId = (req.user as any)?._id ?? (req.user as any)?.id;
    const auditUserId = rawUserId
      ? toEntityId(rawUserId as string | Types.ObjectId)
      : undefined;

    const siteId = toObjectId((req.body as { siteId?: string }).siteId ?? req.siteId) ?? null;
    const role = await Role.create({ ...req.body, tenantId, siteId });
    const entityId = toEntityId(role._id as Types.ObjectId) ?? (role._id as Types.ObjectId);

    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'create',
      entityType: 'Role',
      entityId,
      after: role.toObject(),
    });
    sendResponse(res, role, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const rawUserId = (req.user as any)?._id ?? (req.user as any)?.id;
    const auditUserId = rawUserId
      ? toEntityId(rawUserId as string | Types.ObjectId)
      : undefined;
    const { id } = req.params;
    const roleId = toObjectId(id);
    if (!roleId) {
      return sendResponse(res, null, 'Invalid id', 400);
    }
    const filter = { _id: roleId as Types.ObjectId, ...buildScopedFilter(tenantId, toObjectId(req.siteId)) };
    const existing = await Role.findOne(filter);
    if (!existing) return sendResponse(res, null, 'Not found', 404);
    const payload = { ...req.body };
    if ('siteId' in payload) {
      payload.siteId = toObjectId(payload.siteId as string) ?? null;
    }
    const role = await Role.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    });
    const entityId = toEntityId(roleId) ?? roleId;
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'update',
      entityType: 'Role',
      entityId,
      before: existing.toObject(),
      after: role?.toObject(),
    });
    sendResponse(res, role);
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const rawUserId = (req.user as any)?._id ?? (req.user as any)?.id;
    const auditUserId = rawUserId
      ? toEntityId(rawUserId as string | Types.ObjectId)
      : undefined;
    const { id } = req.params;
    const roleId = toObjectId(id);
    if (!roleId) {
      return sendResponse(res, null, 'Invalid id', 400);
    }
    const filter = { _id: roleId, ...buildScopedFilter(tenantId, toObjectId(req.siteId)) };
    const role = await Role.findOneAndDelete(filter);
    if (!role) {
      return sendResponse(res, null, 'Not found', 404);
    }
    const entityId = toEntityId(roleId) ?? roleId;
    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'delete',
      entityType: 'Role',
      entityId,
      before: role.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
