import { z } from 'zod';
const envSchema = z.object({
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    MONGO_URI: z.string().default('mongodb://localhost:27017/platinum_cmms'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    PORT: z.string().default('5010'),
    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX: z.string().default('100'),
    NODE_ENV: z.string().default('development'),
    PM_SCHEDULER_CRON: z.string().default('*/5 * * * *'),
    PM_SCHEDULER_TASK: z.string().default('./tasks/pmSchedulerTask'),
    DEFAULT_TENANT_ID: z.string().optional(),
});
export function validateEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const missing = parsed.error.flatten().fieldErrors;
        console.error('❌ Invalid environment variables:', missing);
        throw new Error('Missing or invalid environment variables');
    }
    return parsed.data;
}
