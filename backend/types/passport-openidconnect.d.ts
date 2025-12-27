declare module 'passport-openidconnect' {
  import { Strategy as PassportStrategy } from 'passport';
  import type { Profile as PassportProfile } from 'passport';
  import type { User as ExpressUser } from 'express-serve-static-core';

  export interface StrategyOptions {
    issuer: string;
    authorizationURL: string;
    tokenURL: string;
    userInfoURL?: string;
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    response_type?: string;
    passReqToCallback?: boolean;
    prompt?: string;
  }

  export interface Profile extends PassportProfile {
    emails?: Array<{ value: string }>;
    _json?: Record<string, unknown>;
  }

  export type VerifyCallback = (err?: Error | null, user?: ExpressUser | false, info?: unknown) => void;

  export type VerifyFunction = (
    issuer: string,
    sub: string,
    profile: Profile,
    jwtClaims: object | string,
    accessToken: string | object,
    refreshToken: string,
    params: unknown,
    done: VerifyCallback,
  ) => void | Promise<void>;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
  }

  export default Strategy;
}
