/*
 * SPDX-License-Identifier: MIT
 */

import jwt from 'jsonwebtoken';
import type { Response } from 'express';

export interface JwtUser {
  id: string;
  email?: string;
  tenantId?: string;
  role?: string;
  siteId?: string;
  tokenVersion?: number;
}

interface CookieOptions {
  remember?: boolean;
}

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const getRefreshSecret = (): string =>
  process.env.JWT_REFRESH_SECRET ?? `${getAccessSecret()}-refresh`;

const getRememberedTtl = (): number => 1000 * 60 * 60 * 24 * 30; // 30 days
const getSessionTtl = (): number => 1000 * 60 * 60 * 8; // 8 hours

export const signAccess = (payload: JwtUser): string =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' });

export const signRefresh = (payload: JwtUser): string =>
  jwt.sign(payload, getRefreshSecret(), { expiresIn: '30d' });

const isSecure = (): boolean => process.env.NODE_ENV === 'production';

export const setAuthCookies = (
  res: Response,
  access: string,
  refresh: string,
  options?: CookieOptions,
): void => {
  const remember = Boolean(options?.remember);
  const maxAge = remember ? getRememberedTtl() : getSessionTtl();
  res.cookie(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    maxAge,
  });
  res.cookie(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    maxAge: remember ? getRememberedTtl() : getRememberedTtl(),
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isSecure() });
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isSecure() });
};

export default {
  signAccess,
  signRefresh,
  setAuthCookies,
  clearAuthCookies,
};
