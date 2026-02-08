/*
 * SPDX-License-Identifier: MIT
 */

import type { Request } from 'express';
import passport from 'passport';
import type { Profile as OAuthProfile } from 'passport';
import type { VerifyCallback } from 'passport-oauth2';
import type OAuth2Strategy from 'passport-oauth2';
import {
  Strategy as GoogleStrategy,
  type StrategyOptions as GoogleStrategyOptions,
} from 'passport-google-oauth20';
import {
  Strategy as GitHubStrategy,
  type StrategyOptions as GithubStrategyOptions,
} from 'passport-github2';

import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import User from '../../models/User';
import { resolveTenantContext } from '../../auth/tenantContext';
import { getSecurityPolicy } from '../../config/securityPolicies';
import { ROLES, type UserRole } from '../../types/auth';

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

type OAuthCallbackParams = Record<string, unknown>;
type OAuthVerifierArgs =
  | [Request, string, string, OAuthProfile, VerifyCallback]
  | [Request, string, string, OAuthCallbackParams, OAuthProfile, VerifyCallback];
type OAuthVerifier = OAuth2Strategy.VerifyFunctionWithRequest<OAuthProfile, OAuthCallbackParams>;

type OAuthStrategyOptions = {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  passReqToCallback: true;
};

/**
 * Normalize both possible Passport verify callback signatures:
 *  - (req, accessToken, refreshToken, profile, done)
 *  - (req, accessToken, refreshToken, params, profile, done)
 */
const normalizeOAuthArgs = (
  profileOrParams: OAuthProfile | OAuthCallbackParams,
  maybeProfileOrDone: OAuthProfile | VerifyCallback,
  maybeDone?: VerifyCallback
): { profile: OAuthProfile; done: VerifyCallback; params: OAuthCallbackParams | null } => {
  const hasParams = typeof maybeDone === 'function';
  const params = hasParams ? (profileOrParams as OAuthCallbackParams) : null;
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
  siteId?: string;
  roles?: string[];
};

const normalizeRoles = (value: unknown): UserRole[] => {
  if (!value) return [];
  const roles = Array.isArray(value) ? value : [value];
  return roles
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is UserRole => (ROLES as readonly string[]).includes(entry));
};

const resolveObjectId = (value: string | undefined): Types.ObjectId | undefined => {
  if (!value || !Types.ObjectId.isValid(value)) {
    return undefined;
  }
  return new Types.ObjectId(value);
};

async function findOrCreateOAuthUser(_args: {
  provider: 'google' | 'github';
  accessToken: string;
  refreshToken: string;
  profile: OAuthProfile;
  req: Request;
  params: OAuthCallbackParams | null;
}): Promise<OAuthUser | false> {
  // Example data you can use:
  // const providerId = _args.profile.id;
  // const email = _args.profile.emails?.[0]?.value;
  // const displayName = _args.profile.displayName;
  //
  // You probably want: tenantId from req (req.tenantId) or from state param, etc.

  const email = _args.profile.emails?.[0]?.value;
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split('@')[1] ?? null;
  const claims =
    _args.params && typeof _args.params === 'object'
      ? (_args.params as Record<string, unknown>)
      : undefined;

  const profileData = _args.profile as unknown as Record<string, unknown>;
  const tenantContext = await resolveTenantContext({
    provider: _args.provider,
    email: normalizedEmail,
    domain,
    claims,
    profile: profileData,
  });

  const user = await User.findOne({ email: normalizedEmail })
    .select('_id email tenantId siteId roles name')
    .lean()
    .exec();

  if (!user) {
    const securityPolicy = getSecurityPolicy();
    if (!securityPolicy.provisioning.jitProvisioningEnabled) {
      return false;
    }

    const tenantObjectId = resolveObjectId(tenantContext.tenantId);
    if (!tenantObjectId) {
      return false;
    }

    const siteObjectId = resolveObjectId(tenantContext.siteId);
    const displayName = _args.profile.displayName ?? normalizedEmail.split('@')[0];
    const roles = normalizeRoles(tenantContext.roles);
    const employeeId = _args.profile.id || `${_args.provider}-${normalizedEmail}`;

    const newUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      employeeId,
      tenantId: tenantObjectId,
      ...(siteObjectId ? { siteId: siteObjectId } : {}),
      roles: roles.length ? roles : ['tech'],
      passwordHash: randomUUID(),
      mfaEnabled: securityPolicy.mfa.enforced,
    });

    return {
      id: newUser._id.toString(),
      email: normalizedEmail,
      name: newUser.name,
      provider: _args.provider,
      providerId: _args.profile.id,
      tenantId: tenantObjectId.toString(),
      siteId: siteObjectId?.toString(),
      roles: newUser.roles,
    };
  }

  return {
    id: user?._id ? String(user._id) : normalizedEmail,
    email: normalizedEmail,
    name: user?.name ?? _args.profile.displayName,
    provider: _args.provider,
    providerId: _args.profile.id,
    tenantId: tenantContext.tenantId ?? (user?.tenantId ? String(user.tenantId) : undefined),
    siteId: tenantContext.siteId ?? (user?.siteId ? String(user.siteId) : undefined),
    roles: tenantContext.roles ?? (user?.roles ? user.roles.map((role) => String(role)) : undefined),
  };
}

// ---- Verifier ----

const oauthVerifier =
  (provider: 'google' | 'github'): OAuthVerifier =>
  async (...args: OAuthVerifierArgs) => {
    const [req, accessToken, refreshToken, profileOrParams, maybeProfileOrDone, maybeDone] = args;
    const { profile, done, params } = normalizeOAuthArgs(profileOrParams, maybeProfileOrDone, maybeDone);

    if (typeof done !== 'function') {
      return;
    }

    try {
      const user = await findOrCreateOAuthUser({
        provider,
        accessToken,
        refreshToken,
        profile,
        req,
        params,
      });

      if (!user) {
        done(null, false);
        return;
      }

      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  };

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    const googleOptions: OAuthStrategyOptions = {
      clientID: googleId,
      clientSecret: googleSecret,
      callbackURL: '/api/auth/oauth/google/callback',
      passReqToCallback: true,
    };

    // Some package typings disagree (5 vs 6 args). This cast is the minimal compatibility shim.
    passport.use(
      new GoogleStrategy(
        googleOptions as unknown as GoogleStrategyOptions,
        oauthVerifier('google') as any
      )
    );
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    const githubOptions: OAuthStrategyOptions = {
      clientID: githubId,
      clientSecret: githubSecret,
      callbackURL: '/api/auth/oauth/github/callback',
      passReqToCallback: true,
    };

    passport.use(
      new GitHubStrategy(
        githubOptions as unknown as GithubStrategyOptions,
        oauthVerifier('github') as any
      )
    );
  }

  // If your project uses sessions:
  // passport.serializeUser((user: any, done) => done(null, user?.id ?? user));
  // passport.deserializeUser(async (id: string, done) => { ... });
}
