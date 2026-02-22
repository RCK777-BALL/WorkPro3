/*
 * SPDX-License-Identifier: MIT
 */

import User from '../models/User';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { filterFields, auditAction, toEntityId, sendResponse } from '../utils';

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
  'skills',
  'shift',
  'weeklyCapacityHours',
];

const userUpdateFields = [...userCreateFields];
const DEFAULT_NEW_USER_PASSWORD = 'cmms123';

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
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const items = await User.find({ tenantId }).select('-passwordHash');
    sendResponse(res, items);
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
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const item = await User.findOne({ _id: req.params.id, tenantId }).select('-passwordHash');
    if (!item) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, item);
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
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const payload = filterFields(req.body, userCreateFields);
    const passwordHash =
      typeof payload.passwordHash === 'string' && payload.passwordHash.trim().length > 0
        ? payload.passwordHash
        : DEFAULT_NEW_USER_PASSWORD;
    const newItem = new User({ ...payload, passwordHash, tenantId });
    const saved = await newItem.save();
    
    const raw = saved._id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    const safeUser = saved.toObject({
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    });
    // await auditAction(req, 'create', 'User', toEntityId(saved._id) ?? saved._id, undefined, safeUser);
    await auditAction(req, 'create', 'User', saved._id, undefined, safeUser);
    sendResponse(res, safeUser, null, 201);
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
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const update = filterFields(req.body, userUpdateFields);
    const existing = await User.findOne({ _id: req.params.id, tenantId }).select('-passwordHash');
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      update,
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ).select('-passwordHash');
    await auditAction(
      req,
      'update',
      'User',
      // toEntityId(new Types.ObjectId(id)),
      id,
      existing.toObject(),
      updated?.toObject(),
    );
    sendResponse(res, updated);
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
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const deleted = await User.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await auditAction(
      req,
      'delete',
      'User',
      // toEntityId(new Types.ObjectId(id)),
      id,
      deleted.toObject(),
      undefined,
    );
    sendResponse(res, { message: 'Deleted successfully' });
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
      sendResponse(res, null, 'Not authenticated', 401);
      return;
    }
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      sendResponse(res, null, 'Forbidden', 403);
      return;
    }

    const user = await User.findById(req.params.id).select('theme');
    if (!user) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, { theme: user.theme ?? 'system' });
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
      sendResponse(res, null, 'Not authenticated', 401);
      return;
    }
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      sendResponse(res, null, 'Forbidden', 403);
      return;
    }

    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
      sendResponse(res, null, 'Invalid theme', 400);
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { returnDocument: 'after' }
    ).select('theme');
    if (!user) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, { theme: user.theme });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
