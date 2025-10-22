/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';

// Middleware to build a tenant/site filter for queries
const tenantScope = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant ID is required' });
    return;
  }
  req.tenantId = tenantId;

  const siteId = req.siteId || req.header('x-site-id');
  if (siteId) {
    req.siteId = siteId as string;
  }

  (req as any).tenantScope = { tenantId, ...(siteId ? { siteId } : {}) };

  next();
};

export default tenantScope;
