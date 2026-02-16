/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';

import type { AuthedRequestHandler } from '../types/http';
import User from '../models/User';
import { writeAuditLog, sendResponse, toEntityId } from '../utils';

// Helper to normalize a possible ObjectId/string into string
function toIdString(v: unknown): string | undefined {
  if (!v) return undefined;
  // Mongoose ObjectId has a toString method that yields the hex string
  if (typeof (v as any).toString === 'function') return (v as any).toString();
  if (typeof v === 'string') return v;
  return undefined;
}

function resolveUserId(user: unknown): string | undefined {
  const candidate = user as { _id?: unknown; id?: unknown } | undefined;
  return toIdString(candidate?._id) ?? toIdString(candidate?.id);
}

type ThemePreference = {
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
};

type ThemeResponse = {
  theme: 'light' | 'dark' | 'system';
  colorScheme: string;
};

export const getTheme: AuthedRequestHandler<ParamsDictionary, ThemeResponse> = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }

    const userId = resolveUserId(req.user);

    if (!userId) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }

    const user = await User.findById(userId).select('theme colorScheme').lean().exec();

    if (!user) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const theme = user.theme ?? 'system';
    const colorScheme = user.colorScheme ?? 'default';

    sendResponse(res, { theme, colorScheme });
  } catch (err) {
    next(err);
  }
};

type UpdateThemeBody = ThemePreference;

type UpdateThemeHandler = AuthedRequestHandler<ParamsDictionary, ThemeResponse, UpdateThemeBody>;

export const updateTheme: UpdateThemeHandler = async (req, res, next) => {
  try {
    const { theme, colorScheme } = req.body ?? {};
    const tenantId = req.tenantId;

    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }

    if (!req.user) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }

    const userId = resolveUserId(req.user);
    if (!userId) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { theme, colorScheme },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const entityId =
      resolveUserId(req.user) ??
      toIdString(updated?._id) ??
      req.params.id;

    const actorId = resolveUserId(req.user);

    if (entityId && tenantId) {
      const normalizedEntityId = toEntityId(entityId) ?? entityId;

      const auditPayload: Parameters<typeof writeAuditLog>[0] = {
        tenantId,
        action: 'update',
        entityType: 'UserTheme',
        entityId: normalizedEntityId,
        before: null,
        after: { theme: updated.theme, colorScheme: updated.colorScheme },
      };

      if (actorId) {
        auditPayload.userId = toEntityId(actorId) ?? actorId;
      }

      await writeAuditLog(auditPayload);
    }

    sendResponse(res, { theme: updated.theme, colorScheme: updated.colorScheme });
  } catch (err) {
    next(err);
  }
};
