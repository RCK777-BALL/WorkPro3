/*
 * SPDX-License-Identifier: MIT
 */

import passport, { Strategy as PassportStrategy } from 'passport';
import { Strategy as OIDCStrategy } from 'passport-openidconnect';
import type { VerifyCallback } from 'passport-openidconnect';

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
  if (groups.includes('Admin')) return 'admin';
  if (groups.includes('Manager')) return 'supervisor';
  if (groups.includes('Technician')) return 'tech';
  return 'planner';
};

interface UserInfo {
  email?: string | undefined;
  roles: string[];
}

export const oidcVerify: VerifyCallback = async (
  _issuer: string,
  _sub: string,
  profile: OIDCProfile,
  _jwtClaims: Record<string, unknown>,
  _accessToken: string,
  _refreshToken: string,
  _params: Record<string, unknown>,
  done: (err: Error | null, user?: UserInfo) => void,
) => {
  try {
    const email = profile?.emails?.[0]?.value;
    const groups = profile?._json?.groups || [];
    const role = mapRoles(groups);
    const user: UserInfo = { email, roles: [role] };
    done(null, user);
  } catch (err) {
    done(err as Error);
  }
};

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
        oidcVerify,
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
        oidcVerify,
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOIDC, mapRoles, oidcVerify };
