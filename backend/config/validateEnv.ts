/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';
import logger from '../utils/logger';

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
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
  PM_SCHEDULER_CRON: z.string().default('*/5 * * * *'),
  PM_SCHEDULER_TASK: z.string().default('./tasks/PMSchedulerTask'),
  DEFAULT_TENANT_ID: z.string().optional(),
  EXECUTIVE_REPORT_CRON: z.string().default('0 * * * *'),
  ENABLE_OIDC_SSO: z.string().optional(),
  ENABLE_SAML_SSO: z.string().optional(),
  ENABLE_SCIM_API: z.string().optional(),
  SCIM_BEARER_TOKEN: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

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
  return parsed.data;
}

