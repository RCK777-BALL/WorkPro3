/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';

// Middleware to capture x-site-id header and attach to request
const siteScope = (req: Request, _res: Response, next: NextFunction): void => {
  const siteId = req.header('x-site-id');
  if (siteId) {
    req.siteId = siteId;
  }
  next();
};

export default siteScope;
