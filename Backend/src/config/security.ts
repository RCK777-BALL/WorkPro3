/*
 * SPDX-License-Identifier: MIT
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

export const buildHelmet = (): RequestHandler =>
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

export const buildRateLimiter = ({
  windowMs,
  max,
  standardHeaders = true,
  legacyHeaders = false,
}: {
  windowMs: number;
  max: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}): RequestHandler =>
  rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
  });

export const buildWriteLimiter = (windowMs = 15 * 60 * 1000, max = 200): RequestHandler =>
  buildRateLimiter({ windowMs, max });

export const buildAuthLimiter = (windowMs = 15 * 60 * 1000, max = 50): RequestHandler =>
  buildRateLimiter({ windowMs, max });
