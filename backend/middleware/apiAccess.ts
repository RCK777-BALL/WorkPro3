/*
 * SPDX-License-Identifier: MIT
 */

import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

const parseKeys = (raw: string | undefined): Set<string> => {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
};

const apiKeys = parseKeys(process.env.API_ACCESS_KEYS);

export const requireApiKey: RequestHandler = (req, res, next) => {
  if (apiKeys.size === 0) {
    next();
    return;
  }
  const provided =
    (req.headers['x-api-key'] as string | undefined) ||
    (typeof req.query['api_key'] === 'string' ? (req.query['api_key'] as string) : undefined);
  if (provided && apiKeys.has(provided)) {
    next();
    return;
  }
  res.status(401).json({ message: 'Valid API key is required' });
};

const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? '60000', 10);
const max = parseInt(process.env.API_RATE_LIMIT_MAX ?? '60', 10);

export const apiAccessLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiAccessMiddleware: RequestHandler[] = [apiAccessLimiter, requireApiKey];
