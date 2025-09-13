/*
 * SPDX-License-Identifier: MIT
 */

import User from '../models/User';
import { filterFields } from '../utils/filterFields';
import { Request, Response, NextFunction } from 'express';
import { writeAuditLog } from '../utils/audit';

const userCreateFields = [
  'name',
  'email',
  'passwordHash',
  'role',
  'employeeId',
  'managerId',
  'theme',
  'colorScheme',
  'mfaEnabled',
  'mfaSecret',
];

const userUpdateFields = [...userCreateFields];

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Retrieve all users
 *     responses:
 *       200:
 *         description: List of users
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const items = await User.find({ tenantId }).select('-passwordHash');
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const item = await User.findOne({ _id: req.params.id, tenantId }).select('-passwordHash');
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User created
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const payload = filterFields(req.body, userCreateFields);
    const newItem = new User({ ...payload, tenantId });
    const saved = await newItem.save();
    const { passwordHash: _pw, ...safeUser } = saved.toObject();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'User',
      entityId: saved._id,
      after: safeUser,
    });
    res.status(201).json(safeUser);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const update = filterFields(req.body, userUpdateFields);
    const existing = await User.findOne({ _id: req.params.id, tenantId }).select('-passwordHash');
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      update,
      {
        new: true,
        runValidators: true,
      }
    ).select('-passwordHash');
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'User',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion successful
 *       404:
 *         description: User not found
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await User.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'User',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users/{id}/theme:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get a user's theme preference
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Theme preference
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export const getUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const user = await User.findById(req.params.id).select('theme');
    if (!user) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ theme: user.theme ?? 'system' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

/**
 * @openapi
 * /api/users/{id}/theme:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user's theme preference
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *     responses:
 *       200:
 *         description: Theme updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export const updateUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
      res.status(400).json({ message: 'Invalid theme' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { new: true }
    ).select('theme');
    if (!user) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ theme: user.theme });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
