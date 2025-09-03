import TeamMember, { ITeamMember } from '../models/TeamMember';
import { AuthedRequestHandler } from '../types/http';

type IdParams = { id: string };

interface UpdateTeamMemberBody {
  role?: ITeamMember['role'];
  managerId?: string | null;
  [key: string]: any;
}

const roleHierarchy: Record<ITeamMember['role'], ITeamMember['role'][] | null> = {
  admin: null,
  manager: null,
  department_leader: null,
  area_leader: ['manager', 'department_leader'],
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
  } catch (err) {
    next(err);
  }
};

export const createTeamMember: AuthedRequestHandler = async (req, res, next) => {
  try {
    const role = req.body.role;
    if (['admin', 'manager', 'department_leader'].includes(role)) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        return res
          .status(400)
          .json({ message: `managerId is required for role ${role}` });
      }
      await validateHierarchy(role, req.body.managerId, req.tenantId as string);
    }
    const member = new TeamMember({ ...req.body, tenantId: req.tenantId });
    const saved = await member.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateTeamMember: AuthedRequestHandler<
  IdParams,
  any,
  UpdateTeamMemberBody
> = async (req, res, next) => {
  try {
    const role = req.body.role;
    if (['admin', 'manager', 'department_leader'].includes(role)) {
      req.body.managerId = null;
    } else {
      if (!req.body.managerId) {
        return res
          .status(400)
          .json({ message: `managerId is required for role ${role}` });
      }
      await validateHierarchy(role, req.body.managerId, req.tenantId as string);
    }
    const updated = await TeamMember.findByIdAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ errors: err.errors ?? err });
  }
};

export const deleteTeamMember: AuthedRequestHandler = async (req, res, next) => {
  try {
    const hasDependents = await TeamMember.findOne({
      managerId: req.params.id,
      tenantId: req.tenantId,
    });
    if (hasDependents) {
      return res
        .status(400)
        .json({ message: 'Cannot delete: member manages others' });
    }
    const deleted = await TeamMember.findByIdAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
