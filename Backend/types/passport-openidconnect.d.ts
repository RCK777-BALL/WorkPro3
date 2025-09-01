declare module 'passport-openidconnect' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface StrategyOptions {
    issuer: string;
    clientID: string;
    clientSecret: string;
    callbackURL: string;
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
      done: (err: any, user?: any) => void,
    ): void;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
  }

  export default Strategy;
}
