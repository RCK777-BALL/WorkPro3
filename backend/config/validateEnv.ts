/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';
import logger from '../utils/logger';

const envSchema = z.object({
  JWT_SECRET: z.string().optional(),
  MONGO_URI: z
    .string()
    .default('mongodb://localhost:27017/workpro'),
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

  if (!env.JWT_SECRET) {
    if (env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }

    logger.warn(
      'Using default JWT secret for development. Set JWT_SECRET to override the default value.',
    );
  }

  return {
    ...env,
    JWT_SECRET: env.JWT_SECRET ?? 'development-secret',
  };
}

