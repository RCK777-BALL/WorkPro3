/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequest } from '../../types/http';
import { sendResponse } from '../../utils/sendResponse';
import { toObjectId } from '../../utils/ids';

interface ResolveOptions {
  requireUser?: boolean;
  requireTenant?: boolean;
}

interface ResolveResult {
  userId?: Types.ObjectId | undefined;
  tenantId?: string | undefined;
}

const DEFAULT_OPTIONS: ResolveOptions = {
  requireUser: true,
  requireTenant: true,
};

export function resolveUserAndTenant(
  req: AuthedRequest,
  res: Response,
  options: ResolveOptions = DEFAULT_OPTIONS,
): ResolveResult | null {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const tenantId = req.tenantId ?? (typeof req.user?.tenantId === 'string' ? req.user.tenantId : undefined);
  const rawUserId = (req.user as { id?: string; _id?: string })?._id ?? (req.user as { id?: string })?.id;
  const userId = toObjectId(rawUserId ?? null);

  if (config.requireTenant && !tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return null;
  }

  if (config.requireUser && !userId) {
    sendResponse(res, null, 'Not authenticated', 401);
    return null;
  }

  return {
    tenantId: tenantId ?? undefined,
    userId: userId ?? undefined,
  };
}
