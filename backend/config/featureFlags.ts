/*
 * SPDX-License-Identifier: MIT
 */

export type FeatureFlagKey = 'oidc' | 'saml' | 'scim' | 'notificationEmail';

const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const isOidcEnabled = (): boolean => parseBoolean(process.env.ENABLE_OIDC_SSO, true);
export const isSamlEnabled = (): boolean => parseBoolean(process.env.ENABLE_SAML_SSO, false);
export const isScimEnabled = (): boolean => parseBoolean(process.env.ENABLE_SCIM_API, false);
export const isNotificationEmailEnabled = (): boolean =>
  parseBoolean(process.env.ENABLE_NOTIFICATION_EMAIL, true);

export const getFeatureFlags = (): Record<FeatureFlagKey, boolean> => ({
  oidc: isOidcEnabled(),
  saml: isSamlEnabled(),
  scim: isScimEnabled(),
  notificationEmail: isNotificationEmailEnabled(),
});

export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => getFeatureFlags()[flag];

export const getScimToken = (): string | undefined => process.env.SCIM_BEARER_TOKEN;


