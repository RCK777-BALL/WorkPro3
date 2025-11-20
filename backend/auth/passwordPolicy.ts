/*
 * SPDX-License-Identifier: MIT
 */

const COMPLEXITY_RULES = [
  { regex: /.{12,}/, message: 'Password must be at least 12 characters long' },
  { regex: /[a-z]/, message: 'Password must include a lowercase letter' },
  { regex: /[A-Z]/, message: 'Password must include an uppercase letter' },
  { regex: /\d/, message: 'Password must include a number' },
  { regex: /[^A-Za-z0-9]/, message: 'Password must include a symbol' },
];

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors = COMPLEXITY_RULES.filter((rule) => !rule.regex.test(password)).map((rule) => rule.message);
  return { valid: errors.length === 0, errors };
}

export function assertStrongPassword(password: string): void {
  const result = validatePasswordStrength(password);
  if (!result.valid) {
    throw new Error(result.errors.join('; '));
  }
}

export function redactPassword(password: string): string {
  return '*'.repeat(Math.min(password.length, 8)) || '***';
}

