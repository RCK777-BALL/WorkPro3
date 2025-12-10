/*
 * SPDX-License-Identifier: MIT
 */

import ms from 'ms';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

export interface MfaPolicy {
  enforced: boolean;
  optionalForSso: boolean;
  allowedFactors: string[];
}

export interface AuditPolicy {
  retentionDays: number;
}

export interface SessionPolicy {
  shortTtlMs: number;
  longTtlMs: number;
}

export interface ProvisioningPolicy {
  jitProvisioningEnabled: boolean;
}

export interface SecurityPolicy {
  password: PasswordPolicy;
  mfa: MfaPolicy;
  audit: AuditPolicy;
  sessions: SessionPolicy;
  provisioning: ProvisioningPolicy;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseDurationMs = (value: string | undefined, fallback: number): number => {
  const normalized = value?.trim();
  if (!normalized) return fallback;

  const parsed = ms(normalized as ms.StringValue);
  return typeof parsed === 'number' && parsed > 0 ? parsed : fallback;
};

export const getSecurityPolicy = (): SecurityPolicy => ({
  password: {
    minLength: parseNumber(process.env.PASSWORD_MIN_LENGTH, 12),
    requireUppercase: parseBoolean(process.env.PASSWORD_REQUIRE_UPPERCASE, true),
    requireLowercase: parseBoolean(process.env.PASSWORD_REQUIRE_LOWERCASE, true),
    requireNumber: parseBoolean(process.env.PASSWORD_REQUIRE_NUMBER, true),
    requireSymbol: parseBoolean(process.env.PASSWORD_REQUIRE_SYMBOL, true),
  },
  mfa: {
    enforced: parseBoolean(process.env.MFA_ENFORCED, false),
    optionalForSso: parseBoolean(process.env.MFA_OPTIONAL_FOR_SSO, true),
    allowedFactors: (process.env.MFA_ALLOWED_FACTORS ?? 'totp').split(',').map((factor) => factor.trim()).filter(Boolean),
  },
  audit: {
    retentionDays: parseNumber(process.env.AUDIT_LOG_RETENTION_DAYS, 180),
  },
  sessions: {
    shortTtlMs: parseDurationMs(process.env.SESSION_SHORT_TTL, 1000 * 60 * 60 * 8),
    longTtlMs: parseDurationMs(process.env.SESSION_LONG_TTL, 1000 * 60 * 60 * 24 * 30),
  },
  provisioning: {
    jitProvisioningEnabled: parseBoolean(process.env.ENABLE_JIT_PROVISIONING, false),
  },
});

export default { getSecurityPolicy };
