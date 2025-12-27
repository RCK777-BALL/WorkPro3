declare module 'passport-openidconnect' {
  import { Strategy as PassportStrategy } from 'passport';
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

  export interface VerifyCallback {
    (
      issuer: string,
      sub: string,
      profile: any,
      jwtClaims: any,
      accessToken: string,
      refreshToken: string,
      params: any,
      done: (err: any, user?: ExpressUser | false, info?: any) => void,
    ): void;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
  }

  export default Strategy;
}
