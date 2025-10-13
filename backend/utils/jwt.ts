import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Response } from 'express';

export interface JwtUser {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
  role?: string;
}

const durationRegex = /^(\d+)(ms|s|m|h|d)$/i;

function parseDuration(ttl: string | undefined, fallback: string): number {
  const duration = (ttl ?? fallback).trim();
  const match = durationRegex.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * unitMs[unit];
}

export function signAccess(payload: JwtUser) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  const expiresIn = process.env.ACCESS_TOKEN_TTL ?? '15m';
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

export function signRefresh(payload: JwtUser) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  const expiresIn = process.env.REFRESH_TOKEN_TTL ?? '7d';
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

interface CookieOptions {
  remember?: boolean;
}

export function setAuthCookies(res: Response, access: string, refresh: string, options: CookieOptions = {}) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const accessTtlMs = parseDuration(process.env.ACCESS_TOKEN_TTL, '15m');
  const refreshTtlMs = parseDuration(process.env.REFRESH_TOKEN_TTL, '7d');
  const refreshOptions = options.remember ? { maxAge: refreshTtlMs } : {};

  res.cookie('access_token', access, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    domain,
    path: '/',
    maxAge: accessTtlMs,
  });

  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    domain,
    path: '/',
    ...refreshOptions,
  });
}

export function clearAuthCookies(res: Response) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const common = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    domain,
    path: '/',
  };
  res.clearCookie('access_token', common);
  res.clearCookie('refresh_token', common);
}
