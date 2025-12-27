/*
 * SPDX-License-Identifier: MIT
 */

import passport from 'passport';
import type { Strategy as PassportStrategy } from 'passport';
import {
  Strategy as GoogleStrategy,
  type StrategyOptions as GoogleStrategyOptions,
} from 'passport-google-oauth20';
import {
  Strategy as GithubStrategy,
  type StrategyOptions as GithubStrategyOptions,
} from 'passport-github2';
import type { User as ExpressUser } from 'express-serve-static-core';

import type { OAuthProvider } from '../config/oauthScopes';
import { resolveTenantContext } from './tenantContext';

export type { OAuthProvider } from '../config/oauthScopes';

interface OAuthProfile {
  emails?: Array<{ value?: string }>;
  _json?: Record<string, unknown>;
}

type DoneCallback = (err: unknown, user?: ExpressUser | false, info?: unknown) => void;
type OAuthVerifier = (
  accessToken: string,
  refreshToken: string,
  profile: OAuthProfile,
  done: DoneCallback,
) => void | Promise<void>;

const getProfileDomain = (profile: OAuthProfile | undefined): string | null => {
  const domainCandidate = profile?._json?.hd;
  return typeof domainCandidate === 'string' ? domainCandidate : null;
};

const createOAuthVerifier =
  (provider: OAuthProvider): OAuthVerifier =>
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
        domain: getProfileDomain(profile),
        ...(profile?._json ? { profile: profile._json } : {}),
      });

      const user: NonNullable<Parameters<DoneCallback>[1]> = { email };
      if (tenantContext.tenantId) {
        user.tenantId = tenantContext.tenantId;
      }
      if (tenantContext.siteId) {
        user.siteId = tenantContext.siteId;
      }
      if (tenantContext.roles?.length) {
        user.roles = tenantContext.roles;
      }
      if (tenantContext.userId) {
        user.id = tenantContext.userId;
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  };

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    const googleOptions: GoogleStrategyOptions = {
      clientID: googleId,
      clientSecret: googleSecret,
      callbackURL: '/api/auth/oauth/google/callback',
    };
    passport.use(
      'google',
      new GoogleStrategy(
        googleOptions,
        createOAuthVerifier('google'),
      ) as unknown as PassportStrategy,
    );
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    const githubOptions: GithubStrategyOptions = {
      clientID: githubId,
      clientSecret: githubSecret,
      callbackURL: '/api/auth/oauth/github/callback',
    };
    passport.use(
      'github',
      new GithubStrategy(
        githubOptions,
        createOAuthVerifier('github'),
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOAuth };
