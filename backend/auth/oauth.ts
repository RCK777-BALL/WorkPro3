/*
 * SPDX-License-Identifier: MIT
 */

import passport from 'passport';
import type { Strategy as PassportStrategy } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';

import { resolveTenantContext } from './tenantContext';

export { type OAuthProvider } from '../config/oauthScopes';

interface OAuthProfile {
  emails?: Array<{ value?: string }>;
  _json?: Record<string, unknown>;
}

type DoneCallback = (err: unknown, user?: { email?: string; tenantId?: string; siteId?: string; roles?: string[]; id?: string }, info?: unknown) => void;

const createOAuthVerifier = (provider: OAuthProvider) =>
  async (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: DoneCallback) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) {
        done(null, undefined);
        return;
      }

      const tenantContext = await resolveTenantContext({
        provider,
        email,
        domain: (profile?._json?.hd as string | undefined) ?? undefined,
        profile: profile?._json,
      });

      done(null, {
        email,
        tenantId: tenantContext.tenantId,
        siteId: tenantContext.siteId,
        roles: tenantContext.roles,
        id: tenantContext.userId,
      });
    } catch (err) {
      done(err);
    }
  };

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    passport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: '/api/auth/oauth/google/callback',
        },
        createOAuthVerifier('google'),
      ) as unknown as PassportStrategy,
    );
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    passport.use(
      'github',
      new GithubStrategy(
        {
          clientID: githubId,
          clientSecret: githubSecret,
          callbackURL: '/api/auth/oauth/github/callback',
        },
        createOAuthVerifier('github'),
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOAuth };
