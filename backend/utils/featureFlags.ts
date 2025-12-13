/*
 * SPDX-License-Identifier: MIT
 */

export type FeatureFlagKey = 'oidc' | 'saml' | 'scim';

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

export const getFeatureFlags = (): Record<FeatureFlagKey, boolean> => ({
  oidc: parseBoolean(process.env.ENABLE_OIDC),
  saml: parseBoolean(process.env.ENABLE_SAML),
  scim: parseBoolean(process.env.ENABLE_SCIM),
});

export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => getFeatureFlags()[flag];

export default { getFeatureFlags, isFeatureEnabled };
