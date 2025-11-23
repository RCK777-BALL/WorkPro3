/*
 * SPDX-License-Identifier: MIT
 */

export interface FeatureToggles {
  oidc: boolean;
  saml: boolean;
  scim: boolean;
}

const normalizeFlag = (value: string | undefined, defaultValue = false): boolean => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
};

export const readFeatureFlags = (env: NodeJS.ProcessEnv = process.env): FeatureToggles => ({
  oidc: normalizeFlag(env.ENABLE_OIDC, true),
  saml: normalizeFlag(env.ENABLE_SAML),
  scim: normalizeFlag(env.ENABLE_SCIM),
});

export const isFeatureEnabled = (feature: keyof FeatureToggles): boolean => readFeatureFlags()[feature];

export default { readFeatureFlags, isFeatureEnabled };
