import { z } from 'zod';
 import Tenant from '../models/Tenant';
import TeamMember from '../models/TeamMember';
 

const email = z.string().email();

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email,
  password: z.string().min(1),
  tenantId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .refine((val) => Tenant.exists({ _id: val }).then(Boolean), {
      message: 'tenant does not exist',
    }),
  employeeId: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine((val) => TeamMember.exists({ employeeId: val }).then(Boolean), {
      message: 'employee not found',
    }),
});

 
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
