/*
 * SPDX-License-Identifier: MIT
 */

import User from '../models/User';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auditAction, sendResponse } from '../utils';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().default('user'),
  employeeNumber: z.string().min(1),
  trade: z.string().optional(),
  startDate: z.string().datetime().optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
});

const serializeUser = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  trade: user.trade,
  employeeNumber: user.employeeNumber ?? user.employeeId,
  startDate: user.startDate ?? null,
  role: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : 'user',
  isActive: user.active !== false,
  lastLoginAt: user.lastLoginAt ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const items = await User.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendResponse(res, items.map(serializeUser));
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const item = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, serializeUser(item));
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return sendResponse(res, null, parsed.error.flatten(), 400);

    const payload = parsed.data;
    const newUser = await User.create({
      tenantId: req.tenantId,
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      passwordHash: payload.password,
      roles: [payload.role],
      employeeId: payload.employeeNumber,
      employeeNumber: payload.employeeNumber,
      trade: payload.trade,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      active: true,
      isActive: true,
      status: 'active',
    });
    const safeUser = serializeUser(newUser);
    await auditAction(req, 'create', 'User', safeUser.id, undefined, safeUser);
    sendResponse(res, safeUser, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return sendResponse(res, null, parsed.error.flatten(), 400);

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendResponse(res, null, 'Not found', 404);

    const payload = parsed.data;
    if (payload.name !== undefined) user.name = payload.name;
    if (payload.email !== undefined) user.email = payload.email.trim().toLowerCase();
    if (payload.role !== undefined) user.roles = [payload.role as any];
    if (payload.employeeNumber !== undefined) {
      user.employeeNumber = payload.employeeNumber;
      user.employeeId = payload.employeeNumber;
    }
    if (payload.trade !== undefined) user.trade = payload.trade as any;
    if (payload.startDate !== undefined) user.startDate = payload.startDate ? new Date(payload.startDate) : undefined;
    if (payload.isActive !== undefined) {
      user.active = payload.isActive;
      user.isActive = payload.isActive;
      user.status = payload.isActive ? 'active' : 'disabled';
    }

    await user.save();
    sendResponse(res, serializeUser(user));
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendResponse(res, null, 'Not found', 404);

    user.active = false;
    user.isActive = false;
    user.status = 'disabled';
    await user.save();

    sendResponse(res, serializeUser(user));
  } catch (err) {
    next(err);
  }
};

export const getUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return sendResponse(res, null, 'Not authenticated', 401);
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      return sendResponse(res, null, 'Forbidden', 403);
    }

    const user = await User.findById(req.params.id).select('theme');
    if (!user) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, { theme: user.theme ?? 'system' });
  } catch (err) {
    next(err);
  }
};

export const updateUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return sendResponse(res, null, 'Not authenticated', 401);
    if (req.params.id !== userId && !req.user?.roles?.includes('admin')) {
      return sendResponse(res, null, 'Forbidden', 403);
    }
    const theme = req.body?.theme;
    if (!['light', 'dark', 'system'].includes(theme)) {
      return sendResponse(res, null, 'Invalid theme', 400);
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { theme }, { returnDocument: 'after' });
    if (!updated) return sendResponse(res, null, 'Not found', 404);
    sendResponse(res, { theme: updated.theme });
  } catch (err) {
    next(err);
  }
};
