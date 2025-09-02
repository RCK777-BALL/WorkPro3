import type { Strategy as PassportStrategy } from 'passport';

let passport: { use?: (...args: any[]) => void } = {};
let GoogleStrategy: any;
let GithubStrategy: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  passport = require('passport');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GoogleStrategy = require('passport-google-oauth20').Strategy;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GithubStrategy = require('passport-github2').Strategy;
} catch {
  class MockStrategy {
    name: string;
    constructor(options: any, verify: (...args: any[]) => void) {
      this.name = options?.name || 'mock';
    }
  }
  GoogleStrategy = MockStrategy;
  GithubStrategy = MockStrategy;
  passport.use = () => {};
}

export type OAuthProvider = 'google' | 'github';

export const getOAuthScope = (provider: OAuthProvider): string[] => {
  return provider === 'google'
    ? ['profile', 'email']
    : ['user:email'];
};

export const oauthVerify = (
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: (err: any, user?: any) => void,
) => {
  try {
    const email = profile?.emails?.[0]?.value;
    done(null, { email });
  } catch (err) {
    done(err);
  }
};

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret && passport.use) {
    passport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: '/api/auth/oauth/google/callback',
        },
        oauthVerify as any,
      ) as unknown as PassportStrategy,
    );
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret && passport.use) {
    passport.use(
      'github',
      new GithubStrategy(
        {
          clientID: githubId,
          clientSecret: githubSecret,
          callbackURL: '/api/auth/oauth/github/callback',
        },
        oauthVerify as any,
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOAuth, oauthVerify };
