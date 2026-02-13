/*
 * SPDX-License-Identifier: MIT
 */

import TeamMember, { ITeamMember } from '../models/TeamMember';
import type { Request, Response, NextFunction } from 'express';
import { Error as MongooseError, Types } from 'mongoose';
import { writeAuditLog, toEntityId, sendResponse } from '../utils';

type TeamRole =
  | 'general_manager'
  | 'assistant_general_manager'
  | 'operations_manager'
  | 'department_leader'
  | 'assistant_department_leader'
  | 'area_leader'
  | 'team_leader'
  | 'team_member'
  | 'technical_team_member';

type LegacyRole = 'admin' | 'supervisor' | 'manager';

const TEAM_ROLE_HIERARCHY: Record<TeamRole, TeamRole[] | null> = {
  general_manager: null,
  assistant_general_manager: ['general_manager'],
  operations_manager: ['general_manager', 'assistant_general_manager'],
  department_leader: ['general_manager', 'assistant_general_manager', 'operations_manager'],
  assistant_department_leader: ['department_leader'],
  area_leader: ['department_leader', 'assistant_department_leader'],
  team_leader: ['area_leader', 'assistant_department_leader'],
  team_member: ['team_leader'],
  technical_team_member: ['team_leader'],
};

const LEGACY_ROLE_MAP: Record<LegacyRole, TeamRole> = {
  admin: 'general_manager',
  supervisor: 'assistant_general_manager',
  manager: 'operations_manager',
};

const ENTERPRISE_ROLE_MAP: Record<string, TeamRole> = {
  'Global Admin': 'general_manager',
  'Plant Admin': 'operations_manager',
  'Department Leader': 'department_leader',
  'Area Leader': 'area_leader',
  'Team Leader': 'team_leader',
  'Team Member': 'team_member',
};

const isTeamRole = (role: unknown): role is TeamRole =>
  typeof role === 'string' && role in TEAM_ROLE_HIERARCHY;

const normalizeRole = (role: ITeamMember['role'] | undefined): TeamRole | null => {
  if (!role) return null;
  if (isTeamRole(role)) return role;
  if (role in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[role as LegacyRole];
  }
  if (typeof role === 'string' && role in ENTERPRISE_ROLE_MAP) {
    return ENTERPRISE_ROLE_MAP[role];
  }
  return null;
};

const toPlainObject = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object' && typeof (value as any).toObject === 'function') {
    return (value as any).toObject();
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return undefined;
};

async function validateHierarchy(
  role: ITeamMember['role'],
  managerId: string | null | undefined,
  tenantId: string
) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new Error(`Unsupported role ${role}`);
  }
  const allowedManagerRoles = TEAM_ROLE_HIERARCHY[normalizedRole];
  if (!allowedManagerRoles) {
    if (managerId) {
      throw new Error(`${normalizedRole} cannot have a manager`);
    }
    return;
  }

  if (!managerId) {
    throw new Error(`managerId is required for role ${normalizedRole}`);
  }

  const manager = await TeamMember.findOne({ _id: managerId, tenantId });
  if (!manager) {
    throw new Error('Manager not found');
  }

  const managerRole = normalizeRole(manager.role);
  if (!managerRole || !allowedManagerRoles.includes(managerRole)) {
    throw new Error(
      `Manager must have role ${allowedManagerRoles.join(' or ')}`
    );
  }
}

export const getTeamMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  try {
    const members = await TeamMember.find({ tenantId: req.tenantId })
      .select(
        '_id name email role department status employeeId managerId reportsTo avatar plant',
      )
      .lean();

    const formatted = members.map((member: any) => ({
      _id: toEntityId(member._id),
      id: toEntityId(member._id),
      name: member.name,
      email: member.email,
      role: normalizeRole(member.role) ?? member.role,
      department: member.department,
      status: member.status,
      employeeId: member.employeeId,
      managerId: toEntityId(member.managerId ?? member.reportsTo) ?? null,
      plant: toEntityId(member.plant) ?? null,
      avatar: member.avatar,
    }));

    sendResponse(res, formatted);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const normalizedRole = normalizeRole(req.body.role);
    if (!normalizedRole) {
      res.status(400).json({ message: `Unsupported role ${req.body.role}` });
      return;
    }
    req.body.role = normalizedRole;
    if (!TEAM_ROLE_HIERARCHY[normalizedRole]) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        res
          .status(400)
          .json({ message: `managerId is required for role ${normalizedRole}` });
        return;
      }
      await validateHierarchy(normalizedRole, req.body.managerId, tenantId as string);
    }
    const requestedPlant = typeof req.body.plant === 'string' ? req.body.plant : undefined;
    const resolvedPlant =
      (requestedPlant && Types.ObjectId.isValid(requestedPlant)
        ? new Types.ObjectId(requestedPlant)
        : undefined) ??
      (req.siteId && Types.ObjectId.isValid(req.siteId)
        ? new Types.ObjectId(req.siteId)
        : undefined);

    const member = new TeamMember({
      ...req.body,
      tenantId,
      plant: resolvedPlant,
    });
    const saved = await member.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'TeamMember',
      entityId: toEntityId(saved._id),
      after: toPlainObject(saved),
    });
    sendResponse(res, saved, null, 201);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const normalizedRole = normalizeRole(req.body.role);
    if (!normalizedRole) {
      res.status(400).json({ message: `Unsupported role ${req.body.role}` });
      return;
    }
    req.body.role = normalizedRole;
    if (!TEAM_ROLE_HIERARCHY[normalizedRole]) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        res
          .status(400)
          .json({ message: `managerId is required for role ${normalizedRole}` });
        return;
      }
      try {
        await validateHierarchy(normalizedRole, req.body.managerId, tenantId as string);
      } catch (validationErr) {
        const message =
          validationErr instanceof Error
            ? validationErr.message
            : 'Invalid manager information';
        res.status(400).json({ message });
        return;
      }
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await TeamMember.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const payload: Record<string, unknown> = { ...req.body };
    const requestedPlant = typeof req.body.plant === 'string' ? req.body.plant : undefined;
    if (requestedPlant && Types.ObjectId.isValid(requestedPlant)) {
      payload.plant = new Types.ObjectId(requestedPlant);
    } else if (!requestedPlant && req.siteId && Types.ObjectId.isValid(req.siteId)) {
      payload.plant = new Types.ObjectId(req.siteId);
    }

    const updated = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      payload,
      {
        new: true,
        runValidators: true,
      }
    );
    const before = toPlainObject(existing);
    const after = toPlainObject(updated);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'TeamMember',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before,
      after,
    });
    sendResponse(res, updated);
    return;
  } catch (err: unknown) {
    if (err instanceof MongooseError.ValidationError) {
      const errors = Object.values(err.errors).map((error) => error.message);
      sendResponse(res, null, { errors }, 400);
      return;
    }
    if (err instanceof MongooseError.CastError) {
      sendResponse(res, null, { errors: [err.message] }, 400);
      return;
    }
    if (!(err instanceof Error)) {
      return next(new Error('Unknown error occurred while updating team member'));
    }
    return next(err);
  }
};

export const deleteTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const hasDependents = await TeamMember.findOne({
      managerId: req.params.id,
      tenantId,
    });
    if (hasDependents) {
      res
        .status(400)
        .json({ message: 'Cannot delete: member manages others' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await TeamMember.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'TeamMember',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: toPlainObject(deleted),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};
