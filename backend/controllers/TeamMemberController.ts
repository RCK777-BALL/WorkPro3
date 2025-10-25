/*
 * SPDX-License-Identifier: MIT
 */

import TeamMember, { ITeamMember } from '../models/TeamMember';
import type { Request, Response, NextFunction } from 'express';
import { Error as MongooseError, Types } from 'mongoose';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import { sendResponse } from '../utils/sendResponse';

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

const isTeamRole = (role: unknown): role is TeamRole =>
  typeof role === 'string' && role in TEAM_ROLE_HIERARCHY;

const normalizeRole = (role: ITeamMember['role'] | undefined): TeamRole | null => {
  if (!role) return null;
  if (isTeamRole(role)) return role;
  if (role in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[role as LegacyRole];
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
    // Only return basic information for each team member
    const members = await TeamMember.find({ tenantId: req.tenantId })
      .select('name role department status')
      .lean();

    const formatted = members.map((member: any) => ({
      name: member.name,
      role: normalizeRole(member.role) ?? member.role,
      department: member.department,
      status: member.status,
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
    const member = new TeamMember({ ...req.body, tenantId });
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
    const existing = await TeamMember.findById({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await TeamMember.findByIdAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
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
    const deleted = await TeamMember.findByIdAndDelete({
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
