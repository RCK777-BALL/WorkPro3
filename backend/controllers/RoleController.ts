/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import Role from '../models/Role';
import type { PermissionChangeActor } from '../models/PermissionChangeLog';
import { logPermissionChange } from '../src/modules/audit';
import { assertSiteScope, buildRoleScopeFilter, normalizeRoleScope } from '../src/modules/rbac';
import { writeAuditLog, sendResponse, toObjectId, toEntityId } from '../utils';

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const siteId = toObjectId(req.siteId);
    const roles = await Role.find(buildRoleScopeFilter(tenantId, siteId));
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
    const role = await Role.findOne({
      _id: roleId,
      ...buildRoleScopeFilter(tenantId, toObjectId(req.siteId)),
    });
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
      ? toObjectId(rawUserId as string | Types.ObjectId)
      : undefined;
    const permissionActor: PermissionChangeActor | undefined = auditUserId
      ? { id: auditUserId }
      : undefined;
    const scope = normalizeRoleScope({
      tenantId,
      siteId: (req.body as { siteId?: string }).siteId ?? req.siteId,
      departmentId: (req.body as { departmentId?: string }).departmentId,
    });
    if (!scope.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    await assertSiteScope(scope.tenantId, scope.siteId);
    const role = await Role.create({
      ...req.body,
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      departmentId: scope.departmentId,
    });
    const entityId = toEntityId(role._id as Types.ObjectId) ?? (role._id as Types.ObjectId);

    await writeAuditLog({
      tenantId,
      ...(auditUserId ? { userId: auditUserId } : {}),
      action: 'create',
      entityType: 'Role',
      entityId,
      after: role.toObject(),
    });

    await logPermissionChange({
      tenantId,
      siteId: scope.siteId,
      departmentId: role.departmentId ?? null,
      roleId: role._id as Types.ObjectId,
      roleName: role.name,
      before: [],
      after: role.permissions,
      actor: permissionActor,
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
      ? toObjectId(rawUserId as string | Types.ObjectId)
      : undefined;
    const permissionActor: PermissionChangeActor | undefined = auditUserId
      ? { id: auditUserId }
      : undefined;
    const { id } = req.params;
    const roleId = toObjectId(id);
    if (!roleId) {
      return sendResponse(res, null, 'Invalid id', 400);
    }
    const filter = {
      _id: roleId as Types.ObjectId,
      ...buildRoleScopeFilter(tenantId, toObjectId(req.siteId)),
    };
    const existing = await Role.findOne(filter);
    if (!existing) return sendResponse(res, null, 'Not found', 404);
    const scope = normalizeRoleScope({
      tenantId,
      siteId: (req.body as { siteId?: string }).siteId ?? req.siteId,
      departmentId: (req.body as { departmentId?: string }).departmentId,
    });
    if (!scope.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    await assertSiteScope(scope.tenantId, scope.siteId);
    const payload = {
      ...req.body,
      ...(req.body as { siteId?: string }).siteId !== undefined ? { siteId: scope.siteId } : {},
      ...(req.body as { departmentId?: string }).departmentId !== undefined
        ? { departmentId: scope.departmentId }
        : {},
    };
    const role = await Role.findOneAndUpdate(filter, payload, {
      returnDocument: 'after',
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

    await logPermissionChange({
      tenantId,
      siteId: role?.siteId ?? scope.siteId ?? null,
      departmentId: role?.departmentId ?? scope.departmentId ?? null,
      roleId: roleId as Types.ObjectId,
      roleName: role?.name,
      before: existing.permissions,
      after: role?.permissions,
      actor: permissionActor,
    });
    sendResponse(res, role);
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const rawUserId = (req.user as any)?._id ?? (req.user as any)?.id;
    const auditUserId = rawUserId
      ? toObjectId(rawUserId as string | Types.ObjectId)
      : undefined;
    const permissionActor: PermissionChangeActor | undefined = auditUserId
      ? { id: auditUserId }
      : undefined;
    const { id } = req.params;
    const roleId = toObjectId(id);
    if (!roleId) {
      return sendResponse(res, null, 'Invalid id', 400);
    }
    const filter = { _id: roleId, ...buildRoleScopeFilter(tenantId, toObjectId(req.siteId)) };
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

    await logPermissionChange({
      tenantId,
      siteId: role.siteId ?? null,
      departmentId: role.departmentId ?? null,
      roleId: roleId as Types.ObjectId,
      roleName: role.name,
      before: role.permissions,
      after: [],
      actor: permissionActor,
    });
    sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
