/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const rememberField = z
  .preprocess((input) => {
    if (input == null || input === '') {
      return undefined;
    }

    if (typeof input === 'string') {
      const normalized = input.trim().toLowerCase();

      if (['true', '1', 'on', 'yes'].includes(normalized)) {
        return true;
      }

      if (['false', '0', 'off', 'no'].includes(normalized)) {
        return false;
      }
    }

    return input;
  }, z.boolean())
  .optional();

const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email();

const loginBaseSchema = z.object({
  email: emailField.optional(),
  username: emailField.optional(),
  password: z.string().min(1),
  remember: rememberField,
});

export const loginSchema = loginBaseSchema
  .superRefine((data, ctx) => {
    if (!data.email && !data.username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email is required',
        path: ['email'],
      });
    }
  })
  .transform((data) => ({
    email: (data.email ?? data.username ?? '').trim(),
    password: data.password,
    remember: data.remember,
  }));

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
