declare module 'passport-github2' {
  import { Strategy as PassportStrategy } from 'passport';
  import type { Request } from 'express';
  import type { User as ExpressUser } from 'express-serve-static-core';

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    passReqToCallback?: false | undefined;
  }

  export interface StrategyOptionsWithRequest extends StrategyOptions {
    passReqToCallback: true;
  }

  export type VerifyCallback = (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: ExpressUser | false, info?: any) => void,
  ) => void;

  export type VerifyCallbackWithoutRequest = (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: ExpressUser | false, info?: any) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallbackWithoutRequest);
    constructor(options: StrategyOptionsWithRequest, verify: VerifyCallback);
  }

  export default Strategy;
}
