/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types, isValidObjectId } from 'mongoose';

import Role from '../models/Role';
import { writeAuditLog } from '../utils/audit';

export const getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const roleId = new Types.ObjectId(id);
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: 'Not found' });
    res.json(role);
  } catch (err) {
    next(err);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const role = await Role.create({ ...req.body, tenantId });
    const entityId = new Types.ObjectId(role._id);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Role',
      entityId,
      after: role.toObject(),
    });
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const roleId = new Types.ObjectId(id);
    const existing = await Role.findById(roleId);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const role = await Role.findByIdAndUpdate(roleId, req.body, {
      new: true,
      runValidators: true,
    });
    const entityId = roleId;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Role',
      entityId,
      before: existing.toObject(),
      after: role?.toObject(),
    });
    res.json(role);
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const roleId = new Types.ObjectId(id);
    const role = await Role.findByIdAndDelete(roleId);
    if (!role) return res.status(404).json({ message: 'Not found' });
    const entityId = roleId;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Role',
      entityId,
      before: role.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
