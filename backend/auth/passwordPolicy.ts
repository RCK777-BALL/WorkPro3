/*
 * SPDX-License-Identifier: MIT
 */

import { getSecurityPolicy } from '../config/securityPolicies';

const buildComplexityRules = () => {
  const policy = getSecurityPolicy().password;
  const rules: Array<{ regex: RegExp; message: string }> = [];
  if (policy.minLength > 0) {
    rules.push({ regex: new RegExp(`.{${policy.minLength},}`), message: `Password must be at least ${policy.minLength} characters long` });
  }
  if (policy.requireLowercase) {
    rules.push({ regex: /[a-z]/, message: 'Password must include a lowercase letter' });
  }
  if (policy.requireUppercase) {
    rules.push({ regex: /[A-Z]/, message: 'Password must include an uppercase letter' });
  }
  if (policy.requireNumber) {
    rules.push({ regex: /\d/, message: 'Password must include a number' });
  }
  if (policy.requireSymbol) {
    rules.push({ regex: /[^A-Za-z0-9]/, message: 'Password must include a symbol' });
  }
  return rules;
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors = buildComplexityRules()
    .filter((rule) => !rule.regex.test(password))
    .map((rule) => rule.message);
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

