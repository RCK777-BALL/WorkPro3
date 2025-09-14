/*
 * SPDX-License-Identifier: MIT
 */

import TeamMember, { ITeamMember } from '../models/TeamMember';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

const roleHierarchy: Record<ITeamMember['role'], ITeamMember['role'][] | null> = {
  admin: null,
  supervisor: null,
  department_leader: null,
  area_leader: ['supervisor', 'department_leader'],
  team_leader: ['area_leader'],
  team_member: ['team_leader'],
};

async function validateHierarchy(
  role: ITeamMember['role'],
  managerId: string | null | undefined,
  tenantId: string
) {
  const allowedManagerRoles = roleHierarchy[role];
  if (!allowedManagerRoles) {
    if (managerId) {
      throw new Error(`${role} cannot have a manager`);
    }
    return;
  }

  if (!managerId) {
    throw new Error(`managerId is required for role ${role}`);
  }

  const manager = await TeamMember.findOne({ _id: managerId, tenantId });
  if (!manager) {
    throw new Error('Manager not found');
  }

  if (!allowedManagerRoles.includes(manager.role)) {
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
      role: member.role,
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
    const role = req.body.role;
    if (['admin', 'supervisor', 'department_leader'].includes(role)) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        res
          .status(400)
          .json({ message: `managerId is required for role ${role}` });
        return;
      }
      await validateHierarchy(role, req.body.managerId, tenantId as string);
    }
    const member = new TeamMember({ ...req.body, tenantId });
    const saved = await member.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'TeamMember',
      entityId: saved._id,
      after: saved.toObject(),
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
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const role = req.body.role;
    if (['admin', 'supervisor', 'department_leader'].includes(role)) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        res
          .status(400)
          .json({ message: `managerId is required for role ${role}` });
        return;
      }
      await validateHierarchy(role, req.body.managerId, tenantId as string);
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
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'TeamMember',
      entityId: new Types.ObjectId(req.params.id),
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    sendResponse(res, updated);
    return;
  } catch (err: any) {
    sendResponse(res, null, { errors: err.errors ?? err  }, 400);
    return;
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
      entityId: new Types.ObjectId(req.params.id),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};
