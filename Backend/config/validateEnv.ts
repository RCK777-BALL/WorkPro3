import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  PORT: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  NODE_ENV: z.string().optional(),
  PM_SCHEDULER_CRON: z.string().optional(),
  PM_SCHEDULER_TASK: z.string().optional(),
  DEFAULT_TENANT_ID: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv(): EnvVars {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.flatten().fieldErrors;
    console.error('❌ Invalid environment variables:', missing);
    throw new Error('Missing or invalid environment variables');
  }
  return parsed.data;
}

