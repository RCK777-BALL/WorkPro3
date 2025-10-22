import type { Request, Response } from 'express';
import type { AuthedRequest } from '../../types/http';
import { sendResponse } from '../../utils/sendResponse';

interface ResolveOptions {
  requireUser?: boolean;
  requireTenant?: boolean;
}

/**
 * Resolve the current request's user and tenant identifiers.
 * Handles sending standard 401/400 responses when values are missing.
 */
export function resolveUserAndTenant(
  req: AuthedRequest | Request,
  res: Response,
  { requireUser = true, requireTenant = true }: ResolveOptions = {}
): { userId?: string; tenantId?: string } | undefined {
  if (requireUser) {
    const user = req.user as ({ _id?: string; id?: string } & Record<string, any>) | undefined;
    const userId = user?._id ?? user?.id;
    if (!userId) {
      sendResponse(res, null, 'Not authenticated', 401);
      return;
    }
    if (!requireTenant) {
      return { userId };
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    return { userId, tenantId };
  }

  if (requireTenant) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    return { tenantId };
  }

  return {};
}
