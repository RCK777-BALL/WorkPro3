import type { Strategy as PassportStrategy } from 'passport';
import type { VerifyCallback } from 'passport-openidconnect';

let passport: { use?: (...args: any[]) => void } = {};
let OIDCStrategy: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  passport = require('passport');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OIDCStrategy = require('passport-openidconnect').Strategy;
} catch {
  // Fallback mocks if packages are unavailable in test environment
  class MockStrategy {
    name: string;
    constructor(_options: any, _verify: VerifyCallback) {
      this.name = _options?.name || 'oidc';
    }
  }
  OIDCStrategy = MockStrategy;
  passport.use = () => {};
}

export type Provider = 'okta' | 'azure';

export const mapRoles = (groups: string[] = []): string => {
  if (groups.includes('Admin')) return 'admin';
  if (groups.includes('Manager')) return 'manager';
  if (groups.includes('Technician')) return 'technician';
  return 'viewer';
};

export const oidcVerify: VerifyCallback = async (
  _issuer: string,
  _sub: string,
  profile: any,
  _jwtClaims: any,
  _accessToken: string,
  _refreshToken: string,
  _params: any,
  done: (err: any, user?: any) => void,
) => {
  try {
    const email = profile?.emails?.[0]?.value;
    const groups = profile?._json?.groups || [];
    const role = mapRoles(groups);
    const user = { email, role };
    done(null, user);
  } catch (err) {
    done(err);
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
        oidcVerify as any,
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
        oidcVerify as any,
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOIDC, mapRoles, oidcVerify };
