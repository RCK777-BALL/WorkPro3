/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';

export interface JwtUser {
  id: string;
  email: string;
  tenantId?: string;
  role?: string;
  siteId?: string;
  scopes?: string[];
  client?: string;
}

interface CookieOptions {
  remember?: boolean;
}

const isProduction = () => process.env.NODE_ENV === 'production';

const getAccessSecret = (): Secret => {
  const secret = process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  return secret;
};

const getRefreshSecret = (): Secret => {
  return process.env.JWT_REFRESH_SECRET ?? getAccessSecret();
};

type DefinedExpiresIn = Exclude<SignOptions['expiresIn'], undefined>;

const ACCESS_TTL: DefinedExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as DefinedExpiresIn;
const REFRESH_TTL: DefinedExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as DefinedExpiresIn;

export const signAccess = (payload: JwtUser): string =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TTL });

export const signRefresh = (payload: JwtUser): string =>
  jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TTL });

const buildCookieOptions = (maxAge: number) => ({
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: isProduction(),
  maxAge,
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  options: CookieOptions = {},
): void => {
  const remember = options.remember ?? false;
  const accessMaxAge = remember ? 1000 * 60 * 60 * 24 : 1000 * 60 * 15;
  const refreshMaxAge = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 7;

  res.cookie('access_token', accessToken, buildCookieOptions(accessMaxAge));
  res.cookie('refresh_token', refreshToken, buildCookieOptions(refreshMaxAge));
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
};

export { JwtUser as default };
