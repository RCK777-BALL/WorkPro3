/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/getJwtSecret';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';

export interface AuthPayload {
  id: string;
  email: string;
  tenantId?: string;
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
    sendResponse(res, null, 'Unauthorized', 401);
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    sendResponse(res, null, 'Server configuration issue', 500);
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = payload;
    next();
    return;
  } catch {
    sendResponse(res, null, 'Invalid or expired token', 401);
    return;
  }
};
