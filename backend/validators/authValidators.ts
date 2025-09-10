import { z } from 'zod';

const email = z.string().email();

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email,
  password: z.string().min(1),
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
