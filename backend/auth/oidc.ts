/*
 * SPDX-License-Identifier: MIT
 */

import passport, { Strategy as PassportStrategy } from 'passport';
import { Strategy as OIDCStrategy } from 'passport-openidconnect';
import type { VerifyCallback } from 'passport-openidconnect';

import { resolveTenantContext } from './tenantContext';
import { isOidcEnabled } from '../config/featureFlags';

interface OIDCStrategyOptions {
  name?: string;
  issuer: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

interface OIDCProfile {
  emails?: Array<{ value: string }>;
  _json?: { groups?: string[] };
}

// OIDC authentication relies on Passport and the passport-openidconnect strategy.
// These modules are regular dependencies and are imported directly.

export type Provider = 'okta' | 'azure' | 'custom';

export const mapRoles = (groups: string[] = []): string => {
  if (groups.includes('Admin')) return 'general_manager';
  if (groups.includes('Manager')) return 'assistant_general_manager';
  if (groups.includes('Technician')) return 'technical_team_member';
  return 'planner';
};

const createOidcVerifier = (provider: Provider): VerifyCallback =>
  async (
    _issuer,
    _sub,
    profile,
    jwtClaims,
    _accessToken,
    _refreshToken,
    _params,
    done,
  ) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) {
        done(null, undefined);
        return;
      }

      const groups = profile?._json?.groups || [];
      const mappedRole = mapRoles(groups);

      const tenantContext = await resolveTenantContext({
        provider,
        email,
        claims: jwtClaims,
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

  const oktaIssuer = process.env.OKTA_ISSUER;
  const oktaClientId = process.env.OKTA_CLIENT_ID;
  const oktaClientSecret = process.env.OKTA_CLIENT_SECRET;
  if (oktaIssuer && oktaClientId && oktaClientSecret && passport.use) {
    passport.use(
      'okta',
      new OIDCStrategy(
        {
          issuer: oktaIssuer,
          clientID: oktaClientId,
          clientSecret: oktaClientSecret,
          callbackURL: '/api/auth/oidc/okta/callback',
        },
        createOidcVerifier('okta'),
      ) as unknown as PassportStrategy,
    );
  }

  const registered: Provider[] = [];

  for (const provider of providers) {
    if (!passport.use) continue;
    passport.use(
      provider.name,
      new OIDCStrategy(
        {
          issuer: provider.issuer,
          clientID: provider.clientId,
          clientSecret: provider.clientSecret,
          callbackURL: provider.callbackPath,
          authorizationURL: provider.authorizationUrl,
          tokenURL: provider.tokenUrl,
        },
        createOidcVerifier(provider.name),
      ) as unknown as PassportStrategy,
    );
    registered.push(provider.name);
  }

  return registered;
};

export default { configureOIDC, mapRoles, oidcVerify };
