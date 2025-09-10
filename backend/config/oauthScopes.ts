export type OAuthProvider = 'google' | 'github';

export const oauthScopes: Record<OAuthProvider, string[]> = {
  google: ['profile', 'email'],
  github: ['user:email'],
};

export const getOAuthScope = (provider: OAuthProvider): string[] =>
  oauthScopes[provider];

export default oauthScopes;
