/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { getJwtSecret } from '../utils/getJwtSecret';
import type { AuthedRequest } from '../types/http';
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
export const requireAuth: RequestHandler = (req, res, next) => {
  const authedReq = req as AuthedRequest;
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
    authedReq.user = {
      id: payload.id,
      email: payload.email,
      ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
      ...(payload.siteId ? { siteId: payload.siteId } : {}),
    };

    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }

    const headerSiteId = req.header('x-site-id');
    const resolvedSiteId = payload.siteId ?? headerSiteId;
    if (resolvedSiteId) {
      req.siteId = resolvedSiteId;
    }

    next();
    return;
  } catch {
    fail(res, 'Invalid or expired token', 401);
    return;
  }
};
