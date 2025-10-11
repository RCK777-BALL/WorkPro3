/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

import { toEntityId } from '../utils/ids';

type HandlerParams = Parameters<AuthedRequestHandler>;

export const getTheme: AuthedRequestHandler = async (
  req: HandlerParams[0],
  res: HandlerParams[1],
  next: HandlerParams[2],
) => {
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

export const updateTheme: AuthedRequestHandler = async (
  req: HandlerParams[0],
  res: HandlerParams[1],
  next: HandlerParams[2],
) => {
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
    const entityId = req.user?._id ?? req.user?.id ?? updated._id ?? req.params.id;

    if (entityId) {
      await writeAuditLog({
        tenantId,
        userId,
        action: 'update',
        entityType: 'UserTheme',
        entityId: toEntityId(entityId) ?? entityId,
        before: null,
        after: { theme: updated.theme, colorScheme: updated.colorScheme },
      });
    }
    sendResponse(res, { theme: updated.theme, colorScheme: updated.colorScheme });
    return;
  } catch (err) {
    return next(err);
  }
};
