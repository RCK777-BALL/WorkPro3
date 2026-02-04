/*
 * SPDX-License-Identifier: MIT
 */

import type { CorsOptions } from 'cors';

const normalizeOrigin = (origin?: string) => origin?.trim().replace(/\/+$/, '').toLowerCase();

export const parseAllowedOrigins = (value: string | undefined, extras: string[] = []) => {
  const base = (value ?? '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  const all = new Set<string>([...base, ...extras.map((origin) => normalizeOrigin(origin)!).filter(Boolean)]);
  return all;
};

export const buildCorsOptions = (
  rawOrigins: string | undefined,
  options: { allowCredentials?: boolean; extraOrigins?: string[] } = {},
): CorsOptions => {
  const allowedOrigins = parseAllowedOrigins(rawOrigins, options.extraOrigins ?? []);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (normalized && allowedOrigins.has(normalized)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: options.allowCredentials ?? true,
  };
};
