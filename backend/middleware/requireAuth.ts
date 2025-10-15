/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import type { AuthedRequest } from '../types/http';
import type { JwtUser } from '../utils/jwt';

interface DecodedToken extends JwtUser {
  exp?: number;
  iat?: number;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const authedReq = req as AuthedRequest;
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const cookies = (req as any).cookies as
    | (Record<string, unknown> & { access_token?: unknown; auth?: unknown })
    | undefined;
  const cookieToken = typeof cookies?.access_token === 'string'
    ? cookies.access_token
    : typeof cookies?.auth === 'string'
    ? cookies.auth
    : undefined;
  const token = bearer ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
    return;
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    res.status(500).json({ error: { code: 500, message: 'Server configuration issue' } });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as DecodedToken;
    const userPayload: Express.User = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      siteId: payload.siteId,
    };
    authedReq.user = userPayload;

    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }

    const headerSiteId = req.header('x-site-id');
    if (typeof payload.siteId === 'string') {
      req.siteId = payload.siteId;
    } else if (typeof headerSiteId === 'string') {
      req.siteId = headerSiteId;
    }

    next();
  } catch {
    res.status(401).json({ error: { code: 401, message: 'Invalid or expired token' } });
  }
};
