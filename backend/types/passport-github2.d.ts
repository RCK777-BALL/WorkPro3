declare module 'passport-github2' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
  }

  export default Strategy;
}
