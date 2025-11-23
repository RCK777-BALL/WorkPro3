/*
 * SPDX-License-Identifier: MIT
 */

import { getFeatureFlags } from '../utils/featureFlags';

export type Provider = 'okta' | 'azure' | 'custom';

export interface OIDCProviderConfig {
  name: Provider;
  issuer: string;
  clientId: string;
  clientSecret: string;
  callbackPath: string;
  authorizationUrl?: string;
  tokenUrl?: string;
}

const buildConfig = (
  name: Provider,
  issuer?: string,
  clientId?: string,
  clientSecret?: string,
  callbackPath?: string,
): OIDCProviderConfig | undefined => {
  if (!issuer || !clientId || !clientSecret) return undefined;
  const issuerBase = issuer.replace(/\/$/, '');
  return {
    name,
    issuer,
    clientId,
    clientSecret,
    callbackPath: callbackPath ?? `/api/auth/oidc/${name}/callback`,
    authorizationUrl: `${issuerBase}/authorize`,
    tokenUrl: `${issuerBase}/token`,
  };
};

export const getOidcProviderConfigs = (): OIDCProviderConfig[] => {
  if (!getFeatureFlags().oidc) return [];

  const configs: Array<OIDCProviderConfig | undefined> = [
    buildConfig(
      'okta',
      process.env.OKTA_ISSUER,
      process.env.OKTA_CLIENT_ID,
      process.env.OKTA_CLIENT_SECRET,
      process.env.OKTA_CALLBACK_URL,
    ),
    buildConfig(
      'azure',
      process.env.AZURE_ISSUER,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET,
      process.env.AZURE_CALLBACK_URL,
    ),
  ];

  if (process.env.OIDC_CUSTOM_ISSUER && process.env.OIDC_CUSTOM_CLIENT_ID && process.env.OIDC_CUSTOM_CLIENT_SECRET) {
    configs.push(
      buildConfig(
        'custom',
        process.env.OIDC_CUSTOM_ISSUER,
        process.env.OIDC_CUSTOM_CLIENT_ID,
        process.env.OIDC_CUSTOM_CLIENT_SECRET,
        process.env.OIDC_CUSTOM_CALLBACK_URL,
      ),
    );
  }

  return configs.filter(Boolean) as OIDCProviderConfig[];
};

export const getOidcProviderNames = (): Provider[] =>
  getOidcProviderConfigs().map((provider) => provider.name as Provider);

export default { getOidcProviderConfigs, getOidcProviderNames };
