import type { Response } from 'express';
import type { AuthedRequest } from '../../types/http';

interface ResolveOptions {
  requireUser?: boolean;
  requireTenant?: boolean;
}

/**
 * Resolve the current request's user and tenant identifiers.
 * Handles sending standard 401/400 responses when values are missing.
 */
export function resolveUserAndTenant(
  req: AuthedRequest,
  res: Response,
  { requireUser = true, requireTenant = true }: ResolveOptions = {}
): { userId?: string; tenantId?: string } | undefined {
  if (requireUser) {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    if (!requireTenant) {
      return { userId };
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    return { userId, tenantId };
  }

  if (requireTenant) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    return { tenantId };
  }

  return {};
}
