/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/getJwtSecret';
import type { AuthedRequestHandler } from '../types/http';
import { fail } from '../src/lib/http';

export interface AuthPayload {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
  tokenVersion?: number;
}

/**
 * Require a valid JWT to access the route.
 * Reads token from:
 *  - Authorization: Bearer <token>
 *  - cookies.token (requires cookie-parser)
 */
export const requireAuth: AuthedRequestHandler = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;

  const cookieToken = (req as any).cookies?.token as string | undefined;

  const token = bearer ?? cookieToken;
  if (!token) {
    fail(res, 'Unauthorized', 401);
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    fail(res, 'Server configuration issue', 500);
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = payload;

    if (payload.tenantId) {
      (req as any).tenantId = payload.tenantId;
    }

    const headerSiteId = req.header('x-site-id');
    const resolvedSiteId = payload.siteId ?? headerSiteId;
    if (resolvedSiteId) {
      (req as any).siteId = resolvedSiteId;
    }

    next();
    return;
  } catch {
    fail(res, 'Invalid or expired token', 401);
    return;
  }
};
