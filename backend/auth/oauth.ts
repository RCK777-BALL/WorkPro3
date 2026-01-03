/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import {
  Strategy as GoogleStrategy,
  type StrategyOptions as GoogleStrategyOptions,
} from 'passport-google-oauth20';
import {
  Strategy as GithubStrategy,
  type StrategyOptions as GithubStrategyOptions,
} from 'passport-github2';

/**
 * IMPORTANT:
 * - Do NOT import StrategyOptionsWithRequest from passport-google-oauth20 / passport-github2
 *   because many versions DON'T export it (your TS2614 error).
 * - Instead: use StrategyOptions + `passReqToCallback: true`.
 *
 * IMPORTANT 2:
 * - Some passport typings expect a verify callback with 5 args:
 *     (req, accessToken, refreshToken, profile, done)
 * - Others expect 6 args (OAuth2 "params" included):
 *     (req, accessToken, refreshToken, params, profile, done)
 *
 * This file defines a verifier that supports BOTH forms and normalizes arguments.
 */

// ---- Types ----

type OAuthVerifier = (
  ...args:
    | [Request, string, string, OAuthProfile, DoneCallback]
    | [Request, string, string, Record<string, unknown>, OAuthProfile, DoneCallback]
) => void | Promise<void>;

/**
 * Normalize both possible Passport verify callback signatures:
 *  - (req, accessToken, refreshToken, profile, done)
 *  - (req, accessToken, refreshToken, params, profile, done)
 */
const normalizeOAuthArgs = (
  profileOrParams: unknown,
  maybeProfileOrDone: unknown,
  maybeDone?: unknown
): { profile: OAuthProfile; done: VerifyCallback; params: unknown | null } => {
  const hasParams = typeof maybeDone === 'function';
  const params = hasParams ? profileOrParams : null;
  const profile = (hasParams ? maybeProfileOrDone : profileOrParams) as OAuthProfile;
  const done = (hasParams ? maybeDone : maybeProfileOrDone) as VerifyCallback;
  return { profile, done, params };
};

// ---- Your user lookup / create logic (YOU plug this into your project) ----

// Shape returned to Passport. Replace with your real User type if you have one.
export type OAuthUser = {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
  providerId?: string;
  tenantId?: string;
};

/**
 * TODO: Replace this with your real "upsert/find user by provider profile" logic.
 * This stub compiles but returns `false` (no login).
 */
async function findOrCreateOAuthUser(_args: {
  provider: 'google' | 'github';
  accessToken: string;
  refreshToken: string;
  profile: OAuthProfile;
  req: Request;
  params: unknown | null;
}): Promise<OAuthUser | false> {
  // Example data you can use:
  // const providerId = _args.profile.id;
  // const email = _args.profile.emails?.[0]?.value;
  // const displayName = _args.profile.displayName;
  //
  // You probably want: tenantId from req (req.tenantId) or from state param, etc.

  return false;
}

// ---- Verifier ----

const oauthVerifier =
  (provider: 'google' | 'github'): OAuthVerifier =>
  async (req, accessToken, refreshToken, profileOrParams, maybeProfileOrDone, maybeDone) => {
    const { profile, done, params } = normalizeOAuthArgs(profileOrParams, maybeProfileOrDone, maybeDone);

    try {
      const profile = (typeof args[4] === 'function' ? args[3] : args[4]) as OAuthProfile;
      const done =
        typeof args[4] === 'function'
          ? (args[4] as DoneCallback)
          : (args[5] as DoneCallback | undefined);

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
        accessToken,
        refreshToken,
        profile,
        req,
        params,
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (err) {
      return done(err as any);
    }
  };

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    const googleOptions: GoogleStrategyOptions & { passReqToCallback: true } = {
      clientID: googleId,
      clientSecret: googleSecret,
      callbackURL: '/api/auth/oauth/google/callback',
      passReqToCallback: true,
    };

    // Some package typings disagree (5 vs 6 args). This cast is the minimal compatibility shim.
    passport.use(new GoogleStrategy(googleOptions, oauthVerifier('google') as any));
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    const githubOptions: GithubStrategyOptions & { passReqToCallback: true } = {
      clientID: githubId,
      clientSecret: githubSecret,
      callbackURL: '/api/auth/oauth/github/callback',
      passReqToCallback: true,
    };

    passport.use(new GitHubStrategy(githubOptions, oauthVerifier('github') as any));
  }

  // If your project uses sessions:
  // passport.serializeUser((user: any, done) => done(null, user?.id ?? user));
  // passport.deserializeUser(async (id: string, done) => { ... });
}
