import passport from 'passport';
import type { Strategy as PassportStrategy } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';

export { type OAuthProvider } from '../config/oauthScopes';

interface OAuthProfile {
  emails?: Array<{ value?: string }>;
}

interface DoneCallback {
  (err: unknown, user?: { email?: string }, info?: unknown): void;
}

export const oauthVerify = (
  _accessToken: string,
  _refreshToken: string,
  profile: OAuthProfile,
  done: DoneCallback,
): void => {
  try {
    const email = profile?.emails?.[0]?.value;

    // Only include the property when it's defined
    if (email) {
      done(null, { email });
    } else {
      // no email in profile -> no user object (or you could pass false)
      done(null, undefined);
    }
  } catch (err) {
    done(err);
  }
};

export const configureOAuth = () => {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    passport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: '/api/auth/oauth/google/callback',
        },
        oauthVerify,
      ) as unknown as PassportStrategy,
    );
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    passport.use(
      'github',
      new GithubStrategy(
        {
          clientID: githubId,
          clientSecret: githubSecret,
          callbackURL: '/api/auth/oauth/github/callback',
        },
        oauthVerify,
      ) as unknown as PassportStrategy,
    );
  }
};

export default { configureOAuth, oauthVerify };
