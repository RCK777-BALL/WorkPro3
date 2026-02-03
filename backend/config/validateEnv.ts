/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';
import logger from '../utils/logger';

const envSchema = z.object({
  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
  MONGO_URI: z
    .string()
    .default('mongodb://localhost:27017/WorkPro3'),
  MONGO_MAX_POOL_SIZE: z.string().default('20'),
  MONGO_MIN_POOL_SIZE: z.string().default('0'),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: z.string().default('10000'),
  MONGO_SOCKET_TIMEOUT_MS: z.string().default('45000'),
  MONGO_CONNECT_TIMEOUT_MS: z.string().default('10000'),
  MONGO_MAX_IDLE_TIME_MS: z.string().default('300000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.string().default('5010'),
  LABOR_RATE: z.string().default('50'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  MOBILE_RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  MOBILE_RATE_LIMIT_MAX: z.string().default('120'),
  NODE_ENV: z.string().default('development'),
  COOKIE_SECURE: z.string().optional(),
  ENABLE_OIDC: z.string().optional(),
  ENABLE_SAML: z.string().optional(),
  ENABLE_SCIM: z.string().optional(),
  SCIM_BEARER_TOKEN: z.string().optional(),
  PM_SCHEDULER_CRON: z.string().default('*/5 * * * *'),
  PM_SCHEDULER_TASK: z.string().default('./tasks/PMSchedulerTask'),
  DEFAULT_TENANT_ID: z.string().optional(),
  EXECUTIVE_REPORT_CRON: z.string().default('0 * * * *'),
  ENABLE_OIDC_SSO: z.string().optional(),
  ENABLE_SAML_SSO: z.string().optional(),
  ENABLE_SCIM_API: z.string().optional(),
  API_ACCESS_KEYS: z.string().optional(),
  API_RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  API_RATE_LIMIT_MAX: z.string().default('60'),
  REORDER_SUGGESTION_CRON: z.string().default('30 * * * *'),
  REORDER_SUGGESTION_INCLUDE_OPEN_POS: z.string().default('true'),
  REORDER_SUGGESTION_LEAD_TIME_BUFFER: z.string().default('0'),
  REORDER_ALERT_CRON: z.string().default('*/20 * * * *'),
  REORDER_ALERT_NOTIFICATIONS: z.string().default('false'),
  LOGIN_LOCKOUT_THRESHOLD: z.string().default('5'),
  LOGIN_LOCKOUT_WINDOW_MS: z.string().default('900000'),
  LOGIN_LOCKOUT_DURATION_MS: z.string().default('1800000'),
  IDEMPOTENCY_TTL_MS: z.string().default('86400000'),
  JOB_LOCK_TTL_MS: z.string().default('600000'),
});

type ParsedEnv = z.infer<typeof envSchema>;
export type EnvVars = ParsedEnv & { JWT_SECRET: string };

export function validateEnv(): EnvVars {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    if (errors.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    logger.error('❌ Invalid environment variables:', errors);
    throw new Error('Missing or invalid environment variables');
  }

  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET?.trim() ?? env.JWT_ACCESS_SECRET?.trim();
  const mongoUriRaw = process.env.MONGO_URI?.trim();
  const corsOriginRaw = process.env.CORS_ORIGIN?.trim();

  if (isProd) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET or JWT_ACCESS_SECRET must be set and at least 32 characters in production');
    }
    if (!mongoUriRaw) {
      throw new Error('MONGO_URI environment variable is required in production');
    }
    if (!corsOriginRaw) {
      throw new Error('CORS_ORIGIN environment variable is required in production');
    }
  }

  if (!jwtSecret) {
    logger.warn(
      'Using default JWT secret for development. Set JWT_SECRET to override the default value.',
    );
  }

  return {
    ...env,
    JWT_SECRET: jwtSecret ?? 'development-secret',
  };
}
