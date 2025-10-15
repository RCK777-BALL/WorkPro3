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

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: rememberField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
