/*
 * SPDX-License-Identifier: MIT
 */

import TeamMember, { ITeamMember } from '../models/TeamMember';
import type { AuthedRequestHandler } from '../types/http';
import { writeAuditLog } from '../utils/audit';

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

export const getTeamMembers: AuthedRequestHandler = async (req, res, next) => {

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

    res.json(formatted);
    return;
  } catch (err) {
    return next(err);
  }
};

export const createTeamMember: AuthedRequestHandler = async (req, res, next) => {

  try {
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
      await validateHierarchy(role, req.body.managerId, req.tenantId as string);
    }
    const member = new TeamMember({ ...req.body, tenantId: req.tenantId });
    const saved = await member.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId: req.tenantId,
      userId,
      action: 'create',
      entityType: 'TeamMember',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateTeamMember: AuthedRequestHandler = async (req, res) => {

  try {
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
      await validateHierarchy(role, req.body.managerId, req.tenantId as string);
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await TeamMember.findById({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const updated = await TeamMember.findByIdAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    await writeAuditLog({
      tenantId: req.tenantId,
      userId,
      action: 'update',
      entityType: 'TeamMember',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
    return;
  } catch (err: any) {
    res.status(400).json({ errors: err.errors ?? err });
    return;
  }
};

export const deleteTeamMember: AuthedRequestHandler = async (req, res, next) => {

  try {
    const hasDependents = await TeamMember.findOne({
      managerId: req.params.id,
      tenantId: req.tenantId,
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
      tenantId: req.tenantId,
    });
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId: req.tenantId,
      userId,
      action: 'delete',
      entityType: 'TeamMember',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    return next(err);
  }
};
