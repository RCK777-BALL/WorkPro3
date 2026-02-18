/*
 * SPDX-License-Identifier: MIT
 */

import passport, { Strategy as PassportStrategy } from 'passport';
import { Strategy as OIDCStrategy } from 'passport-openidconnect';
import type { Profile, VerifyCallback, VerifyFunction } from 'passport-openidconnect';

import { resolveTenantContext } from './tenantContext';
import { getOidcProviderConfigs } from '../config/ssoProviders';
import { isOidcEnabled } from '../config/featureFlags';

type OidcIssuer = Parameters<VerifyFunction>[0];
type OidcSubject = Parameters<VerifyFunction>[1];
type OidcIdToken = Parameters<VerifyFunction>[3];
type OidcAccessToken = Parameters<VerifyFunction>[4];
type OidcRefreshToken = Parameters<VerifyFunction>[5];
type OidcParams = Parameters<VerifyFunction>[6];
type OidcVerifyCallback = VerifyCallback;

type OidcProfile = Profile & {
  _json?: { groups?: string[] };
};

type OidcVerifyFunction = VerifyFunction;

// OIDC authentication relies on Passport and the passport-openidconnect strategy.
// These modules are regular dependencies and are imported directly.

export type Provider = 'okta' | 'azure' | 'custom';

export const mapRoles = (groups: string[] = []): string => {
  if (groups.includes('Admin')) return 'general_manager';
  if (groups.includes('Manager')) return 'assistant_general_manager';
  if (groups.includes('Technician')) return 'technical_team_member';
  return 'planner';
};

const createOidcVerifier = (provider: Provider): OidcVerifyFunction =>
  async (
    _issuer: OidcIssuer,
    _sub: OidcSubject,
    profile: OidcProfile,
    jwtClaims: OidcIdToken,
    _accessToken: OidcAccessToken,
    _refreshToken: OidcRefreshToken,
    _params: OidcParams,
    done: OidcVerifyCallback,
  ) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) {
        done(null, undefined);
        return;
      }

      const groups = profile?._json?.groups || [];
      const mappedRole = mapRoles(groups);
      const claims =
        typeof jwtClaims === 'object' && jwtClaims !== null
          ? (jwtClaims as Record<string, unknown>)
          : undefined;

      const tenantContext = await resolveTenantContext({
        provider,
        email,
        claims,
        ...(profile?._json ? { profile: profile._json } : {}),
      });

      const roles = tenantContext.roles && tenantContext.roles.length > 0
        ? tenantContext.roles
        : [mappedRole].filter(Boolean);

      done(null, {
        email,
        roles,
        tenantId: tenantContext.tenantId,
        siteId: tenantContext.siteId,
        id: tenantContext.userId,
      });
    } catch (err) {
      done(err as Error);
    }
  };

export const oidcVerify = createOidcVerifier('okta');

export const configureOIDC = () => {
  if (!isOidcEnabled()) {
    return;
  }

  const providers = getOidcProviderConfigs();
  const registered: Provider[] = [];

  for (const provider of providers) {
    if (!passport.use) continue;
    const issuerBase = provider.issuer.replace(/\/$/, '');
    passport.use(
      provider.name,
      new OIDCStrategy(
        {
          issuer: provider.issuer,
          clientID: provider.clientId,
          clientSecret: provider.clientSecret,
          callbackURL: provider.callbackPath,
          authorizationURL: provider.authorizationUrl ?? `${issuerBase}/authorize`,
          tokenURL: provider.tokenUrl ?? `${issuerBase}/token`,
          userInfoURL: `${issuerBase}/userinfo`,
        },
        createOidcVerifier(provider.name),
      ) as unknown as PassportStrategy,
    );
    registered.push(provider.name);
  }

  return registered;
};

export default { configureOIDC, mapRoles, oidcVerify };
