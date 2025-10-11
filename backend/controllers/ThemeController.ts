/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';

import type { AuthedRequestHandler } from '../types/http';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';
import { toEntityId } from '../utils/ids';

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
    const { theme = 'system', colorScheme = 'default' } = (req.user ?? {}) as ThemePreference;
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

    const userId = req.user._id ?? req.user.id;
    if (!userId) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { theme, colorScheme },
      { new: true, runValidators: true },
    );

    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const entityId = req.user._id ?? req.user.id ?? updated._id?.toString() ?? req.params.id;
    const actorId = (req.user._id ?? req.user.id)?.toString();

    if (entityId && tenantId) {
      await writeAuditLog({
        tenantId,
        userId: actorId,
        action: 'update',
        entityType: 'UserTheme',
        entityId: toEntityId(entityId) ?? entityId,
        before: null,
        after: { theme: updated.theme, colorScheme: updated.colorScheme },
      });
    }

    sendResponse(res, { theme: updated.theme, colorScheme: updated.colorScheme });
  } catch (err) {
    next(err);
  }
};
