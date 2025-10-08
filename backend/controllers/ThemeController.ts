/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

import { toEntityId } from '../utils/ids';

export const getTheme: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { user } = req;

    const { theme = 'system', colorScheme = 'default' } = (user ?? {}) as {
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    };

    sendResponse(res, { theme, colorScheme });
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateTheme: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { theme, colorScheme } = req.body;
    const { user } = req;
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }


    if (!user) {
      return sendResponse(res, null, 'Unauthorized', 401);
    }

    const updated = await User.findByIdAndUpdate(
      user?._id,
      { theme, colorScheme },
      { new: true, runValidators: true }
    );

    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'UserTheme',
      entityId: toEntityId(req.user?._id ?? req.params.id),

      before: null,
      after: { theme: updated.theme, colorScheme: updated.colorScheme },
    });
    sendResponse(res, { theme: updated.theme, colorScheme: updated.colorScheme });
    return;
  } catch (err) {
    return next(err);
  }
};
