/*
 * SPDX-License-Identifier: MIT
 */

import passport, { Strategy as PassportStrategy } from 'passport';
import { Strategy as OIDCStrategy } from 'passport-openidconnect';
import type { VerifyCallback } from 'passport-openidconnect';

import { resolveTenantContext } from './tenantContext';

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

export type Provider = 'okta' | 'azure';

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
        profile: profile?._json,
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

  const azureIssuer = process.env.AZURE_ISSUER;
  const azureClientId = process.env.AZURE_CLIENT_ID;
  const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
  if (azureIssuer && azureClientId && azureClientSecret && passport.use) {
    passport.use(
      'azure',
      new OIDCStrategy(
        {
          issuer: azureIssuer,
          clientID: azureClientId,
          clientSecret: azureClientSecret,
          callbackURL: '/api/auth/oidc/azure/callback',
        },
        createOidcVerifier('azure'),
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOIDC, mapRoles, oidcVerify };
