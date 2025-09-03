let passport = {};
let OIDCStrategy;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    passport = require('passport');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    OIDCStrategy = require('passport-openidconnect').Strategy;
}
catch {
    // Fallback mocks if packages are unavailable in test environment
    class MockStrategy {
        constructor(_options, _verify) {
            this.name = _options?.name || 'oidc';
        }
    }
    OIDCStrategy = MockStrategy;
    passport.use = () => { };
}
export const mapRoles = (groups = []) => {
    if (groups.includes('Admin'))
        return 'admin';
    if (groups.includes('Manager'))
        return 'manager';
    if (groups.includes('Technician'))
        return 'technician';
    return 'viewer';
};
export const oidcVerify = async (_issuer, _sub, profile, _jwtClaims, _accessToken, _refreshToken, _params, done) => {
    try {
        const email = profile?.emails?.[0]?.value;
        const groups = profile?._json?.groups || [];
        const role = mapRoles(groups);
        const user = { email, role };
        done(null, user);
    }
    catch (err) {
        done(err);
    }
};
export const configureOIDC = () => {
    const oktaIssuer = process.env.OKTA_ISSUER;
    const oktaClientId = process.env.OKTA_CLIENT_ID;
    const oktaClientSecret = process.env.OKTA_CLIENT_SECRET;
    if (oktaIssuer && oktaClientId && oktaClientSecret && passport.use) {
        passport.use('okta', new OIDCStrategy({
            issuer: oktaIssuer,
            clientID: oktaClientId,
            clientSecret: oktaClientSecret,
            callbackURL: '/api/auth/oidc/okta/callback',
        }, oidcVerify));
    }
    const azureIssuer = process.env.AZURE_ISSUER;
    const azureClientId = process.env.AZURE_CLIENT_ID;
    const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
    if (azureIssuer && azureClientId && azureClientSecret && passport.use) {
        passport.use('azure', new OIDCStrategy({
            issuer: azureIssuer,
            clientID: azureClientId,
            clientSecret: azureClientSecret,
            callbackURL: '/api/auth/oidc/azure/callback',
        }, oidcVerify));
    }
};
export default { configureOIDC, mapRoles, oidcVerify };
