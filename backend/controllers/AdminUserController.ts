/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';

import User from '../models/User';
import sendResponse from '../utils/sendResponse';

const TRADE_OPTIONS = ['Electrical', 'Mechanical', 'Tooling', 'Facilities', 'Automation', 'Other'] as const;

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  trade: z.enum(TRADE_OPTIONS).default('Other'),
  employeeNumber: z.string().min(1),
  startDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  role: z.string().min(1),
  tempPassword: z.string().min(10),
});

const patchSchema = createSchema.partial().omit({ tempPassword: true }).extend({
  status: z.enum(['active', 'invited', 'disabled']).optional(),
  tempPassword: z.string().min(10).optional(),
});

const serializeUser = (user: any) => ({
  id: user._id.toString(),
  fullName: user.name,
  email: user.email,
  trade: user.trade ?? 'Other',
  employeeNumber: user.employeeNumber ?? user.employeeId,
  startDate: user.startDate ? new Date(user.startDate).toISOString() : null,
  role: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : 'user',
  roles: Array.isArray(user.roles) ? user.roles : [],
  status: user.status ?? (user.active === false ? 'disabled' : 'active'),
  active: user.active !== false,
  mustChangePassword: Boolean(user.mustChangePassword),
  createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
});

export const listAdminUsers: RequestHandler = async (req, res, next) => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const users = await User.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendResponse(res, users.map(serializeUser));
  } catch (error) {
    next(error);
  }
};

export const createAdminUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendResponse(res, null, parsed.error.flatten(), 400);

    const email = parsed.data.email.trim().toLowerCase();
    const exists = await User.findOne({ tenantId: req.tenantId, email });
    if (exists) return sendResponse(res, null, 'Email already in use', 409);

    const user = await User.create({
      tenantId: req.tenantId,
      name: parsed.data.fullName,
      email,
      passwordHash: parsed.data.tempPassword,
      employeeId: parsed.data.employeeNumber,
      employeeNumber: parsed.data.employeeNumber,
      trade: parsed.data.trade,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      roles: [parsed.data.role],
      status: 'active',
      active: true,
      mustChangePassword: true,
    });

    sendResponse(res, { user: serializeUser(user), inviteSent: false }, null, 201);
  } catch (error) {
    next(error);
  }
};

export const patchAdminUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    if (!Types.ObjectId.isValid(req.params.id)) return sendResponse(res, null, 'Invalid user id', 400);

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return sendResponse(res, null, parsed.error.flatten(), 400);

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendResponse(res, null, 'User not found', 404);

    if (parsed.data.fullName) user.name = parsed.data.fullName;
    if (parsed.data.email) user.email = parsed.data.email.trim().toLowerCase();
    if (parsed.data.trade) user.trade = parsed.data.trade;
    if (parsed.data.employeeNumber) {
      user.employeeNumber = parsed.data.employeeNumber;
      user.employeeId = parsed.data.employeeNumber;
    }
    if (parsed.data.startDate !== undefined) {
      user.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
    }
    if (parsed.data.role) user.roles = [parsed.data.role as any];
    if (parsed.data.status) {
      user.status = parsed.data.status;
      user.active = parsed.data.status !== 'disabled';
    }
    if (parsed.data.tempPassword) {
      user.passwordHash = parsed.data.tempPassword;
      user.mustChangePassword = true;
      user.status = user.status === 'disabled' ? 'disabled' : 'active';
      user.active = user.status !== 'disabled';
    }

    await user.save();
    sendResponse(res, { user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const resetAdminUserPassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const tempPassword = typeof req.body?.tempPassword === 'string' ? req.body.tempPassword : '';
    if (tempPassword.trim().length < 10) {
      return sendResponse(res, null, 'Temporary password must be at least 10 characters', 400);
    }

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendResponse(res, null, 'User not found', 404);

    user.passwordHash = tempPassword;
    user.mustChangePassword = true;
    user.active = true;
    user.status = 'active';
    await user.save();

    sendResponse(res, { user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendResponse(res, null, 'User not found', 404);

    user.active = false;
    user.status = 'disabled';
    await user.save();

    sendResponse(res, { ok: true });
  } catch (error) {
    next(error);
  }
};
