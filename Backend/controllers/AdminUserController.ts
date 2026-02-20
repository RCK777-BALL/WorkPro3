/*
 * SPDX-License-Identifier: MIT
 */

import { randomBytes, createHash } from 'crypto';
import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';

import User from '../models/User';
import type { AuthedRequest } from '../types/http';
import { ROLES } from '../types/auth';
import { sendResponse, writeAuditLog } from '../utils';

const TRADE_OPTIONS = ['Electrical', 'Mechanical', 'Tooling', 'Facilities', 'Automation', 'Other'] as const;
const USER_STATUSES = ['active', 'invited', 'disabled'] as const;
const SHIFT_OPTIONS = ['day', 'swing', 'night'] as const;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeEmployeeNumber = (value: string): string => value.trim();
const parseBoolean = (value: unknown, defaultValue = false): boolean => {
  if (typeof value !== 'string') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const isInviteFlowEnabled = (): boolean => parseBoolean(process.env.ENABLE_USER_INVITES, false);
const inviteTtlMinutes = (): number => {
  const parsed = Number.parseInt(process.env.INVITE_TOKEN_TTL_MINUTES ?? '1440', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1440;
};

const createModeSchema = z.union([
  z.object({
    mode: z.literal('temp_password'),
    tempPassword: z.string().min(10, 'Temporary password must be at least 10 characters'),
  }),
  z.object({
    mode: z.literal('invite'),
  }),
]);

const createAdminUserSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    trade: z.enum(TRADE_OPTIONS, { errorMap: () => ({ message: 'Trade is required' }) }),
    employeeNumber: z.string().trim().min(1, 'Employee number is required'),
    startDate: z.string().trim().min(1, 'Start date is required'),
    role: z.string().trim().default('team_member'),
    shift: z.enum(SHIFT_OPTIONS).default('day'),
    weeklyCapacityHours: z.number().min(1).max(168).default(40),
    skills: z.array(z.string().trim().min(1)).default([]),
    notifyByEmail: z.boolean().default(true),
    notifyBySms: z.boolean().default(false),
  })
  .and(createModeSchema);

const updateAdminUserSchema = z
  .object({
    fullName: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    trade: z.enum(TRADE_OPTIONS).optional(),
    employeeNumber: z.string().trim().min(1).optional(),
    startDate: z.string().trim().min(1).optional(),
    role: z.string().trim().optional(),
    status: z.enum(USER_STATUSES).optional(),
    mustChangePassword: z.boolean().optional(),
    tempPassword: z.string().min(10).optional(),
    shift: z.enum(SHIFT_OPTIONS).optional(),
    weeklyCapacityHours: z.number().min(1).max(168).optional(),
    skills: z.array(z.string().trim().min(1)).optional(),
    notifyByEmail: z.boolean().optional(),
    notifyBySms: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.fullName ||
      value.email ||
      value.trade ||
      value.employeeNumber ||
      value.startDate ||
      value.role ||
      value.status ||
      value.mustChangePassword !== undefined ||
      value.tempPassword ||
      value.shift ||
      value.weeklyCapacityHours !== undefined ||
      value.skills ||
      value.notifyByEmail !== undefined ||
      value.notifyBySms !== undefined,
    {
    message: 'At least one updatable field is required',
    },
  );

const serializeUser = (user: any) => ({
  id: user._id.toString(),
  fullName: user.name,
  email: user.email,
  trade: user.trade ?? 'Other',
  employeeNumber: user.employeeNumber ?? user.employeeId,
  employeeId: user.employeeId,
  startDate: user.startDate ? new Date(user.startDate).toISOString() : null,
  role: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : 'team_member',
  roles: Array.isArray(user.roles) ? user.roles : [],
  shift: user.shift ?? 'day',
  weeklyCapacityHours:
    typeof user.weeklyCapacityHours === 'number' ? user.weeklyCapacityHours : 40,
  skills: Array.isArray(user.skills) ? user.skills : [],
  notifyByEmail: user.notifyByEmail !== false,
  notifyBySms: user.notifyBySms === true,
  mustChangePassword: Boolean(user.mustChangePassword),
  status: user.status ?? (user.active === false ? 'disabled' : 'active'),
  invitedAt: user.invitedAt ? new Date(user.invitedAt).toISOString() : null,
  active: user.active !== false,
  createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
});

export async function listAdminUsers(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const trade = typeof req.query.trade === 'string' ? req.query.trade.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    if (trade && TRADE_OPTIONS.includes(trade as (typeof TRADE_OPTIONS)[number])) {
      filter.trade = trade;
    }
    if (role) {
      filter.roles = role;
    }
    if (status && USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) {
      filter.status = status;
    }

    const users = await User.find(filter)
      .select([
        '_id',
        'name',
        'email',
        'trade',
        'employeeNumber',
        'employeeId',
        'startDate',
        'roles',
        'shift',
        'weeklyCapacityHours',
        'skills',
        'notifyByEmail',
        'notifyBySms',
        'mustChangePassword',
        'status',
        'invitedAt',
        'active',
        'createdAt',
        'updatedAt',
      ])
      .sort({ createdAt: -1 })
      .lean();

    sendResponse(res, users.map(serializeUser));
  } catch (error) {
    next(error);
  }
}

export async function createAdminUser(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    const parsed = createAdminUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.issues.map((issue) => issue.message), 400);
      return;
    }

    if (parsed.data.role && !(ROLES as readonly string[]).includes(parsed.data.role)) {
      sendResponse(res, null, 'Invalid role selected', 400);
      return;
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const normalizedEmployeeNumber = normalizeEmployeeNumber(parsed.data.employeeNumber);
    const parsedStartDate = new Date(parsed.data.startDate);
    if (Number.isNaN(parsedStartDate.getTime())) {
      sendResponse(res, null, 'startDate must be a valid ISO date', 400);
      return;
    }

    const existingEmail = await User.findOne({ email: normalizedEmail, tenantId: req.tenantId }).lean();
    if (existingEmail) {
      sendResponse(res, null, 'Email already exists', 409);
      return;
    }

    const existingEmployeeNumber = await User.findOne({
      tenantId: req.tenantId,
      $or: [{ employeeNumber: normalizedEmployeeNumber }, { employeeId: normalizedEmployeeNumber }],
    }).lean();
    if (existingEmployeeNumber) {
      sendResponse(res, null, 'Employee number already exists', 409);
      return;
    }

    const role = parsed.data.role || 'team_member';
    const skills = Array.from(
      new Set(
        (parsed.data.skills ?? [])
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
    const baseUser: Record<string, unknown> = {
      name: parsed.data.fullName,
      email: normalizedEmail,
      trade: parsed.data.trade,
      employeeNumber: normalizedEmployeeNumber,
      employeeId: normalizedEmployeeNumber,
      startDate: parsedStartDate,
      roles: [role],
      shift: parsed.data.shift ?? 'day',
      weeklyCapacityHours: parsed.data.weeklyCapacityHours ?? 40,
      skills,
      notifyByEmail: parsed.data.notifyByEmail ?? true,
      notifyBySms: parsed.data.notifyBySms ?? false,
      tenantId: req.tenantId,
    };

    if (parsed.data.mode === 'invite' && !isInviteFlowEnabled()) {
      sendResponse(res, null, 'Invite workflow is disabled', 400);
      return;
    }

    let inviteLink: string | null = null;
    if (parsed.data.mode === 'invite') {
      const token = randomBytes(32).toString('hex');
      const inviteHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + inviteTtlMinutes() * 60_000);
      const frontendBase = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
      inviteLink = `${frontendBase}/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`;

      Object.assign(baseUser, {
        passwordHash: randomBytes(24).toString('hex'),
        status: 'invited',
        active: true,
        invitedAt: new Date(),
        inviteTokenHash: inviteHash,
        inviteExpiresAt: expiresAt,
        mustChangePassword: true,
        passwordExpired: true,
      });
    } else {
      Object.assign(baseUser, {
        passwordHash: parsed.data.tempPassword,
        status: 'active',
        active: true,
        mustChangePassword: true,
        passwordExpired: true,
      });
    }

    const created = await User.create(baseUser);
    if (inviteLink) {
      console.info(`[admin-invite] ${normalizedEmail} -> ${inviteLink}`);
    }

    await writeAuditLog({
      tenantId: req.tenantId,
      userId: req.user?._id ?? req.user?.id,
      action: 'admin_user_create',
      entityType: 'User',
      entityId: created._id.toString(),
      after: {
        email: created.email,
        employeeNumber: created.employeeNumber ?? created.employeeId,
        role,
        mode: parsed.data.mode,
        status: created.status,
      },
    });

    sendResponse(
      res,
      {
        user: serializeUser(created),
        inviteSent: parsed.data.mode === 'invite',
      },
      null,
      201,
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern ?? {})[0];
      const message =
        key === 'email'
          ? 'Email already exists'
          : key === 'employeeNumber' || key === 'employeeId'
          ? 'Employee number already exists'
          : 'Duplicate user data';
      sendResponse(res, null, message, 409);
      return;
    }
    next(error);
  }
}

export async function patchAdminUser(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!Types.ObjectId.isValid(req.params.id)) {
      sendResponse(res, null, 'Invalid user id', 400);
      return;
    }

    const parsed = updateAdminUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.issues.map((issue) => issue.message), 400);
      return;
    }

    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('+inviteTokenHash');
    if (!user) {
      sendResponse(res, null, 'User not found', 404);
      return;
    }

    if (parsed.data.fullName) {
      user.name = parsed.data.fullName;
    }
    if (parsed.data.email) {
      const normalizedEmail = normalizeEmail(parsed.data.email);
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({
          _id: { $ne: user._id },
          tenantId: req.tenantId,
          email: normalizedEmail,
        }).lean();
        if (existing) {
          sendResponse(res, null, 'Email already exists', 409);
          return;
        }
        user.email = normalizedEmail;
      }
    }
    if (parsed.data.trade) {
      user.trade = parsed.data.trade;
    }
    if (parsed.data.employeeNumber) {
      const normalizedEmployeeNumber = normalizeEmployeeNumber(parsed.data.employeeNumber);
      if (normalizedEmployeeNumber !== (user.employeeNumber ?? user.employeeId)) {
        const existing = await User.findOne({
          _id: { $ne: user._id },
          tenantId: req.tenantId,
          $or: [{ employeeNumber: normalizedEmployeeNumber }, { employeeId: normalizedEmployeeNumber }],
        }).lean();
        if (existing) {
          sendResponse(res, null, 'Employee number already exists', 409);
          return;
        }
      }
      user.employeeNumber = normalizedEmployeeNumber;
      user.employeeId = normalizedEmployeeNumber;
    }
    if (parsed.data.startDate) {
      const parsedStartDate = new Date(parsed.data.startDate);
      if (Number.isNaN(parsedStartDate.getTime())) {
        sendResponse(res, null, 'startDate must be a valid ISO date', 400);
        return;
      }
      user.startDate = parsedStartDate;
    }
    if (parsed.data.role) {
      if (!(ROLES as readonly string[]).includes(parsed.data.role)) {
        sendResponse(res, null, 'Invalid role selected', 400);
        return;
      }
      user.roles = [parsed.data.role] as any;
    }
    if (parsed.data.shift) {
      user.shift = parsed.data.shift;
    }
    if (typeof parsed.data.weeklyCapacityHours === 'number') {
      user.weeklyCapacityHours = parsed.data.weeklyCapacityHours;
    }
    if (parsed.data.skills) {
      user.skills = Array.from(
        new Set(
          parsed.data.skills.map((entry) => entry.trim()).filter(Boolean),
        ),
      );
    }
    if (typeof parsed.data.notifyByEmail === 'boolean') {
      user.notifyByEmail = parsed.data.notifyByEmail;
    }
    if (typeof parsed.data.notifyBySms === 'boolean') {
      user.notifyBySms = parsed.data.notifyBySms;
    }

    if (parsed.data.status) {
      user.status = parsed.data.status;
      user.active = parsed.data.status !== 'disabled';
    }
    if (typeof parsed.data.mustChangePassword === 'boolean') {
      user.mustChangePassword = parsed.data.mustChangePassword;
      user.passwordExpired = parsed.data.mustChangePassword;
    }
    if (parsed.data.tempPassword) {
      user.passwordHash = parsed.data.tempPassword;
      user.mustChangePassword = true;
      user.passwordExpired = true;
      user.status = user.status === 'disabled' ? 'disabled' : 'active';
      user.active = user.status !== 'disabled';
      user.inviteTokenHash = undefined;
      user.inviteExpiresAt = undefined;
    }

    await user.save();

    await writeAuditLog({
      tenantId: req.tenantId,
      userId: req.user?._id ?? req.user?.id,
      action: 'admin_user_patch',
      entityType: 'User',
      entityId: user._id.toString(),
      after: {
        status: user.status,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
      },
    });

    sendResponse(res, { user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

const ensureTargetUser = async (req: AuthedRequest, res: Response) => {
  if (!req.tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return null;
  }
  if (!Types.ObjectId.isValid(req.params.id)) {
    sendResponse(res, null, 'Invalid user id', 400);
    return null;
  }
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('+inviteTokenHash');
  if (!user) {
    sendResponse(res, null, 'User not found', 404);
    return null;
  }
  return user;
};

export async function resetAdminUserPassword(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await ensureTargetUser(req, res);
    if (!user) return;

    const parsed = z
      .object({
        tempPassword: z.string().min(10, 'Temporary password must be at least 10 characters'),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.issues.map((issue) => issue.message), 400);
      return;
    }

    user.passwordHash = parsed.data.tempPassword;
    user.mustChangePassword = true;
    user.passwordExpired = true;
    user.status = user.status === 'disabled' ? 'disabled' : 'active';
    user.active = user.status !== 'disabled';
    user.inviteTokenHash = undefined;
    user.inviteExpiresAt = undefined;

    await user.save();

    await writeAuditLog({
      tenantId: req.tenantId!,
      userId: req.user?._id ?? req.user?.id,
      action: 'admin_user_reset_password',
      entityType: 'User',
      entityId: user._id.toString(),
      after: {
        mustChangePassword: true,
        status: user.status,
      },
    });

    sendResponse(res, { user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminUser(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await ensureTargetUser(req, res);
    if (!user) return;

    const requesterId = req.user?._id?.toString?.() ?? req.user?.id?.toString?.();
    if (requesterId && requesterId === user._id.toString()) {
      sendResponse(res, null, 'You cannot delete your own account', 400);
      return;
    }

    const targetRoles = Array.isArray(user.roles) ? user.roles : [];
    const targetIsAdmin = targetRoles.includes('admin') || targetRoles.includes('general_manager');
    if (targetIsAdmin) {
      const adminCount = await User.countDocuments({
        tenantId: req.tenantId,
        _id: { $ne: user._id },
        roles: { $in: ['admin', 'general_manager'] },
      });
      if (adminCount < 1) {
        sendResponse(res, null, 'Cannot delete the last administrator', 400);
        return;
      }
    }

    await User.deleteOne({ _id: user._id, tenantId: req.tenantId });

    await writeAuditLog({
      tenantId: req.tenantId!,
      userId: req.user?._id ?? req.user?.id,
      action: 'admin_user_delete',
      entityType: 'User',
      entityId: user._id.toString(),
      before: {
        email: user.email,
        roles: user.roles,
        status: user.status,
      },
    });

    sendResponse(res, { id: user._id.toString() });
  } catch (error) {
    next(error);
  }
}
