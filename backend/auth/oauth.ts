/*
 * SPDX-License-Identifier: MIT
 */

import passport, { type Profile as PassportProfile, type Strategy as PassportStrategy } from 'passport';
import type { VerifyCallback } from 'passport-oauth2';
import type { Request } from 'express';
import {
  Strategy as GoogleStrategy,
  type StrategyOptionsWithRequest as GoogleStrategyOptionsWithRequest,
} from 'passport-google-oauth20';
import {
  Strategy as GithubStrategy,
  type StrategyOptionsWithRequest as GithubStrategyOptionsWithRequest,
} from 'passport-github2';

import type { OAuthProvider } from '../config/oauthScopes';
import { resolveTenantContext } from './tenantContext';

export type { OAuthProvider } from '../config/oauthScopes';

type OAuthProfile = PassportProfile & {
  emails?: Array<{ value?: string }>;
  _json?: Record<string, unknown>;
};

type DoneCallback = VerifyCallback;
type OAuthVerifier = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  paramsOrProfile: OAuthProfile | unknown,
  profileOrDone: OAuthProfile | DoneCallback,
  done?: DoneCallback,
) => void | Promise<void>;

type OAuthUser = {
  email: string;
  tenantId?: string;
  siteId?: string;
  roles?: string[];
  id?: string;
};

const getProfileDomain = (profile: OAuthProfile | undefined): string | null => {
  const domainCandidate = profile?._json?.hd;
  return typeof domainCandidate === 'string' ? domainCandidate : null;
};

const createOAuthVerifier =
  (provider: OAuthProvider): OAuthVerifier =>
  async (
    _req: Request,
    _accessToken: string,
    _refreshToken: string,
    paramsOrProfile: OAuthProfile | unknown,
    profileOrDone: OAuthProfile | DoneCallback,
    doneMaybe?: DoneCallback,
  ) => {
    let doneCallback: DoneCallback | undefined;
    try {
      const [profile, done] =
        typeof profileOrDone === 'function'
          ? [paramsOrProfile as OAuthProfile, profileOrDone]
          : [profileOrDone, doneMaybe];

      if (!done) {
        return;
      }
      doneCallback = done;

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

      const user: OAuthUser = { email };
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

      doneCallback(null, user);
    } catch (err) {
      doneCallback?.(err);
    }
  };

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    const googleOptions: GoogleStrategyOptionsWithRequest = {
      clientID: googleId,
      clientSecret: googleSecret,
      callbackURL: '/api/auth/oauth/google/callback',
      passReqToCallback: true,
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
    const githubOptions: GithubStrategyOptionsWithRequest = {
      clientID: githubId,
      clientSecret: githubSecret,
      callbackURL: '/api/auth/oauth/github/callback',
      passReqToCallback: true,
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
