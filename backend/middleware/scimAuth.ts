/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { isScimEnabled, getScimToken } from '../config/featureFlags';

const unauthorized = (res: Response) => {
  res.status(401).json({ message: 'Invalid SCIM token' });
};

export const scimAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isScimEnabled()) {
    res.status(404).json({ message: 'SCIM is disabled' });
    return;
  }

  const tenantId = req.header('X-Tenant-Id');
  if (!tenantId) {
    res.status(400).json({ message: 'Missing tenant identifier' });
    return;
  }

  (req as Request & { tenantId?: string }).tenantId = tenantId;

  const authHeader = req.header('Authorization');
  if (!authHeader) {
    unauthorized(res);
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || token !== getScimToken()) {
    unauthorized(res);
    return;
  }

  next();
};

export default scimAuth;
