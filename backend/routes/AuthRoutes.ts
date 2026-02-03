/*
 * SPDX-License-Identifier: MIT
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import { z } from 'zod';
import { Types } from 'mongoose';

import User, { type UserDocument } from '../models/User';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiters';
import { getJwtSecret } from '../utils/getJwtSecret';
import { isCookieSecure } from '../utils/isCookieSecure';
import logger from '../utils/logger';
import { assertEmail } from '../utils/assert';
import { getOAuthScope, type OAuthProvider } from '../config/oauthScopes';
import { me, refresh, logout } from '../controllers/authController';
import sendResponse from '../utils/sendResponse';
import { configureOAuth } from '../src/auth/oauth';
import { configureOIDC, type Provider as OIDCProvider } from '../auth/oidc';
import { getOidcProviderConfigs, type OIDCProviderConfig } from '../config/ssoProviders';
import { getSamlMetadata, samlRedirectPlaceholder, samlResponseHandler } from '../auth/saml';
import { isIdentityProviderAllowed } from '../services/identityProviderService';
import { isFeatureEnabled, isOidcEnabled } from '../config/featureFlags';
import { validatePasswordStrength } from '../auth/passwordPolicy';
import { logAuthenticationEvent } from '../src/modules/audit';
import type { AuthedRequest } from '../types/http';
import { getSecurityPolicy } from '../config/securityPolicies';
import { buildSessionBinding } from '../utils/sessionBinding';
import { provisionUserFromIdentity } from '../services/jitProvisioningService';
import { writeAuditLog } from '../utils/audit';
import { setAuthCookies, signAccess, signRefresh } from '../utils/jwt';

configureOAuth();
if (isFeatureEnabled('oidc')) {
  configureOIDC();
}

const ROLE_PRIORITY = [
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'viewer',
];

const normalizeRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  const list = Array.isArray(roles) ? roles : [roles];
  const normalized: string[] = [];
  for (const role of list) {
    if (typeof role !== 'string') continue;
    const candidate = role.toLowerCase();
    if (!normalized.includes(candidate)) {
      normalized.push(candidate);
    }
  }
  return normalized;
};

const derivePrimaryRole = (role: unknown, roles: string[]): string => {
  if (typeof role === 'string') {
    const candidate = role.toLowerCase();
    if (ROLE_PRIORITY.includes(candidate)) {
      return candidate;
    }
  }
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) {
      return candidate;
    }
  }
  return roles[0] ?? 'tech';
};

const toStringId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString(): string }).toString();
  }
  return undefined;
};

const resolveRequestTenant = (req: Request): string | undefined => {
  const headerTenant = req.header('x-tenant-id');
  if (typeof headerTenant === 'string' && headerTenant.trim()) {
    return headerTenant.trim();
  }
  return (req as AuthedRequest).tenantId;
};

const sanitizeRedirect = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const trimmed = decoded.trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return undefined;
  }
  if (!trimmed.startsWith('/')) {
    return undefined;
  }
  if (trimmed.startsWith('/login') || trimmed.startsWith('/auth/callback')) {
    return undefined;
  }
  return trimmed;
};

const getRequestedRedirect = (req: Request): string | undefined => {
  if (typeof req.query.state === 'string') {
    return sanitizeRedirect(req.query.state);
  }
  if (typeof req.query.redirect === 'string') {
    return sanitizeRedirect(req.query.redirect);
  }
  return undefined;
};

const recordAuthEvent = async ({
  user,
  action,
  tenantId,
  details,
}: {
  user?: UserDocument | null;
  action: string;
  tenantId?: string;
  details?: Record<string, unknown>;
}) =>
  logAuthenticationEvent({
    user,
    action,
    tenantId,
    details,
  });

const buildFrontendCallbackUrl = (token: string): string => {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL('http://localhost:5173');
  }

  url.pathname = '/auth/callback';
  url.search = '';
  url.hash = '';
  url.searchParams.set('ssoToken', token);
  return url.toString();
};

const extractPassportRoles = (user: unknown): string[] => {
  if (!user || typeof user !== 'object') {
    return [];
  }
  const payload = user as { roles?: unknown; role?: unknown };
  return normalizeRoles(payload.roles ?? payload.role);
};

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'github'];
const OIDC_PROVIDER_CONFIGS: readonly OIDCProviderConfig[] = getOidcProviderConfigs();
const OIDC_PROVIDERS: readonly OIDCProvider[] = OIDC_PROVIDER_CONFIGS.map((provider) => provider.name);

const isStaticOidcProvider = (provider: string): provider is OIDCProvider =>
  (OIDC_PROVIDERS as readonly string[]).includes(provider);

const isAllowedOidcProvider = async (provider: string): Promise<boolean> => {
  if (!isOidcEnabled()) {
    return false;
  }

  if (isStaticOidcProvider(provider)) {
    return true;
  }

  return isIdentityProviderAllowed(provider, 'oidc');
};

const registerBodySchema = registerSchema.extend({
  name: z.string().min(1, 'Name is required'),
  tenantId: z.string().min(1, 'Tenant is required').optional(),
  employeeId: z.string().min(1, 'Employee ID is required'),
});

const mfaSetupSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
});

const mfaVerifySchema = mfaSetupSchema.extend({
  token: z.string().min(1, 'MFA token is required'),
  remember: z.boolean().optional(),
});

const bootstrapRotationSchema = z.object({
  rotationToken: z.string().min(1, 'Rotation token is required'),
  newPassword: z.string().min(12, 'New password is required'),
  mfaToken: z.string().min(1, 'MFA token is required'),
});

const ssoCallbackSchema = z.object({
  token: z.string().min(1, 'SSO token is required'),
});

const FAKE_PASSWORD_HASH = bcrypt.hashSync('invalid-password', 10);

const AUTH_COOKIE_NAME = 'auth';
const TOKEN_TTL = '7d';
const SECURITY_POLICY = getSecurityPolicy();
const SHORT_SESSION_MS = SECURITY_POLICY.sessions.shortTtlMs;
const LONG_SESSION_MS = SECURITY_POLICY.sessions.longTtlMs;
const LOGIN_POLICY = SECURITY_POLICY.login;
const ROTATION_TOKEN_PURPOSE = 'bootstrap-rotation';
const STATE_TOKEN_PURPOSE = 'oauth-state';
const STATE_TOKEN_TTL = '10m';
const SSO_CALLBACK_TOKEN_PURPOSE = 'sso-callback';
const SSO_CALLBACK_TOKEN_TTL = '5m';

type AuthUser = {
  tenantId?: string;
  role: string;
  roles: string[];
  id: string;
  _id: string;
} & Record<string, unknown>;

const toAuthUser = (user: UserDocument): AuthUser => {
  const plain = user.toObject<Record<string, unknown>>();
  delete (plain as Record<string, unknown>).password;
  delete (plain as Record<string, unknown>).passwordHash;

  const normalizedRoles = normalizeRoles((plain as { roles?: unknown }).roles);
  const primaryRole = derivePrimaryRole((plain as { role?: unknown }).role, normalizedRoles);
  const roles = Array.from(new Set([primaryRole, ...normalizedRoles]));
  const userId = user._id.toString();

  const tenantValue = (plain as { tenantId?: unknown }).tenantId;
  const tenantId =
    typeof tenantValue === 'string'
      ? tenantValue
      : tenantValue && typeof (tenantValue as { toString?: () => string }).toString === 'function'
      ? (tenantValue as { toString(): string }).toString()
      : undefined;

  return {
    ...plain,
    id: userId,
    _id: userId,
    tenantId,
    role: primaryRole,
    roles,
  } as AuthUser;
};

const signRotationToken = (userId: string): string => {
  const secret = getJwtSecret();
  return jwt.sign({ id: userId, purpose: ROTATION_TOKEN_PURPOSE }, secret, { expiresIn: '15m' });
};

const decodeRotationToken = (token: string): { id: string } | null => {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as { id?: string; purpose?: string };
    if (payload.purpose !== ROTATION_TOKEN_PURPOSE || !payload.id) {
      return null;
    }
    return { id: payload.id };
  } catch (error) {
    logger.warn('Invalid rotation token', error);
    return null;
  }
};

const setAuthCookie = (res: Response, token: string, remember: boolean): void => {
  const maxAge = remember ? LONG_SESSION_MS : SHORT_SESSION_MS;

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isCookieSecure(),
    maxAge,
  });
};

const sendAuthSuccess = (
  res: Response,
  authUser: AuthUser,
  token: string,
  remember: boolean,
  extra?: Record<string, unknown>,
): void => {
  setAuthCookie(res, token, remember);

  sendResponse(
    res,
    {
      token,
      user: authUser,
      ...(extra ?? {}),
    },
    null,
    200,
    'Login successful',
  );
};

const isAccountLocked = (user: UserDocument) => {
  if (!user.lockoutUntil) {
    return false;
  }
  return user.lockoutUntil.getTime() > Date.now();
};

const clearLockoutState = (user: UserDocument) => {
  user.failedLoginCount = 0;
  user.lastFailedLoginAt = undefined;
  user.lockoutUntil = undefined;
};

const registerFailedLogin = async (user: UserDocument) => {
  const now = Date.now();
  const lastFailed = user.lastFailedLoginAt?.getTime() ?? 0;
  const withinWindow = now - lastFailed <= LOGIN_POLICY.windowMs;
  const nextCount = withinWindow ? (user.failedLoginCount ?? 0) + 1 : 1;
  user.failedLoginCount = nextCount;
  user.lastFailedLoginAt = new Date(now);

  if (nextCount >= LOGIN_POLICY.maxAttempts) {
    user.lockoutUntil = new Date(now + LOGIN_POLICY.lockoutMs);
    user.failedLoginCount = 0;
  }

  await user.save();
};

type OAuthStatePayload = {
  purpose: typeof STATE_TOKEN_PURPOSE;
  redirect?: string;
  nonce: string;
};

type SsoCallbackPayload = {
  purpose: typeof SSO_CALLBACK_TOKEN_PURPOSE;
  id: string;
  tenantId: string;
  siteId?: string;
  redirect?: string;
  provider?: string;
};

const signStateToken = (redirect?: string): string | null => {
  try {
    const secret = getJwtSecret();
    const payload: OAuthStatePayload = {
      purpose: STATE_TOKEN_PURPOSE,
      redirect: redirect ?? undefined,
      nonce: randomUUID(),
    };
    return jwt.sign(payload, secret, { expiresIn: STATE_TOKEN_TTL });
  } catch (error) {
    logger.error('Unable to sign OAuth state token', error);
    return null;
  }
};

const verifyStateToken = (token: string | undefined): OAuthStatePayload | null => {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as Partial<OAuthStatePayload>;
    if (payload.purpose !== STATE_TOKEN_PURPOSE || !payload.nonce) {
      return null;
    }
    return payload as OAuthStatePayload;
  } catch (error) {
    logger.warn('Invalid OAuth state token', error);
    return null;
  }
};

const signSsoCallbackToken = (payload: Omit<SsoCallbackPayload, 'purpose'>): string | null => {
  try {
    const secret = getJwtSecret();
    return jwt.sign(
      {
        ...payload,
        purpose: SSO_CALLBACK_TOKEN_PURPOSE,
      },
      secret,
      { expiresIn: SSO_CALLBACK_TOKEN_TTL },
    );
  } catch (error) {
    logger.error('Unable to sign SSO callback token', error);
    return null;
  }
};

const verifySsoCallbackToken = (token: string): SsoCallbackPayload | null => {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as Partial<SsoCallbackPayload>;
    if (payload.purpose !== SSO_CALLBACK_TOKEN_PURPOSE || !payload.id || !payload.tenantId) {
      return null;
    }
    return payload as SsoCallbackPayload;
  } catch (error) {
    logger.warn('Invalid SSO callback token', error);
    return null;
  }
};

const setupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const parsed = mfaSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  try {
    const user = await User.findById(parsed.data.userId).select('+mfaSecret +mfaEnabled');
    if (!user) {
      sendResponse(res, null, 'User not found', 404);
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false;
    await user.save();

    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    sendResponse(
      res,
      { secret: secret.base32, token },
      null,
      200,
      'MFA secret generated',
    );
  } catch (err) {
    logger.error('MFA setup error:', err);
    next(err);
  }
};

const validateMfaToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const parsed = mfaVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  const { userId, token, remember = false } = parsed.data;

  try {
    const user = await User.findById(userId).select(
      '+mfaSecret +mfaEnabled +tenantId +tokenVersion +email +name +roles +role +siteId',
    );
    if (!user || !user.mfaSecret) {
      sendResponse(res, null, 'MFA not configured', 400);
      return;
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      await recordAuthEvent({
        user,
        action: 'mfa_failed',
        details: { reason: 'invalid_token' },
      });
      sendResponse(res, null, 'Invalid MFA token', 400);
      return;
    }

    user.mfaEnabled = true;
    await user.save();

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, 'Server configuration issue', 500);
      return;
    }

    const authUser = toAuthUser(user);
    const emailForToken =
      typeof authUser.email === 'string' ? authUser.email : user.email ?? '';

    const signed = jwt.sign(
      {
        id: authUser.id,
        email: emailForToken,
        tenantId: authUser.tenantId,
        tokenVersion: user.tokenVersion,
        session: buildSessionBinding(req),
      },
      secret,
      { expiresIn: TOKEN_TTL },
    );

    await recordAuthEvent({
      user,
      action: 'mfa_validated',
      details: { method: 'totp' },
    });

    sendAuthSuccess(res, authUser, signed, remember);
  } catch (err) {
    logger.error('MFA verification error:', err);
    next(err);
  }
};

const router = Router();
router.use(passport.initialize());

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request.', 400);
    return;
  }

  const { email, password, remember = false } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash +mfaEnabled +tenantId +tokenVersion +email +name +roles +role +siteId +passwordExpired +bootstrapAccount +mfaSecret +active +failedLoginCount +lastFailedLoginAt +lockoutUntil +lastLoginAt',
    );

    if (!user || user.active === false) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    if (isAccountLocked(user)) {
      await recordAuthEvent({
        user,
        action: 'login_locked',
        details: { lockoutUntil: user.lockoutUntil },
      });
      sendResponse(res, null, 'Account temporarily locked. Try again later.', 423);
      return;
    }

    const requestTenantId = resolveRequestTenant(req);
    const userTenantId = toStringId(user.tenantId);
    if (requestTenantId && userTenantId && requestTenantId !== userTenantId) {
      sendResponse(res, null, 'Invalid tenant for user', 403);
      return;
    }

    if (requestTenantId && !userTenantId) {
      user.tenantId = new Types.ObjectId(requestTenantId);
      await user.save();
    }

    const hashed = user.passwordHash;
    if (!hashed) {
      await bcrypt.compare(password, FAKE_PASSWORD_HASH);
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    const valid = await bcrypt.compare(password, hashed);
    if (!valid) {
      await registerFailedLogin(user);
      await recordAuthEvent({
        user,
        action: 'login_failed',
        details: { reason: 'invalid_credentials', email: normalizedEmail },
      });
      sendResponse(res, null, 'Invalid email or password.', 400);
      return;
    }

    clearLockoutState(user);
    user.lastLoginAt = new Date();
    await user.save();

    if (user.passwordExpired || user.bootstrapAccount) {
      const secret = user.mfaSecret || speakeasy.generateSecret({ length: 20 }).base32;
      if (!user.mfaSecret) {
        user.mfaSecret = secret;
      }
      user.mfaEnabled = false;
      user.passwordExpired = true;
      user.bootstrapAccount = true;
      await user.save();

      const rotationToken = signRotationToken(user._id.toString());
      await recordAuthEvent({
        user,
        action: 'password_rotation_required',
        details: { email: user.email },
      });
      sendResponse(
        res,
        {
          rotationRequired: true,
          userId: user._id.toString(),
          email: user.email,
          rotationToken,
          mfaSecret: user.mfaSecret,
        },
        null,
        423,
        'Password rotation required before login',
      );
      return;
    }

    if (user.mfaEnabled || (SECURITY_POLICY.mfa.enforced && !user.mfaEnabled)) {
      await recordAuthEvent({
        user,
        action: 'mfa_challenge',
        details: { enforced: SECURITY_POLICY.mfa.enforced },
      });
      sendResponse(
        res,
        {
          mfaRequired: true,
          userId: user._id.toString(),
        },
        null,
        200,
        'Multi-factor authentication required',
      );
      return;
    }

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, 'Server configuration issue', 500);
      return;
    }

    const authUser = toAuthUser(user);
    const emailForToken = typeof authUser.email === 'string' ? authUser.email : normalizedEmail;

    const tokenPayload = {
      id: authUser.id,
      email: emailForToken,
      tenantId: authUser.tenantId,
      tokenVersion: user.tokenVersion,
      session: buildSessionBinding(req),
    };

    const token = signAccess(tokenPayload);
    const refreshToken = signRefresh(tokenPayload);
    setAuthCookies(res, token, refreshToken, { remember });

    await recordAuthEvent({
      user,
      action: 'login_success',
      details: { remember, method: 'password' },
    });

    sendAuthSuccess(res, authUser, token, remember);
  } catch (err) {
    logger.error('Login error:', err);
    next(err);
  }
});

router.post('/sso/callback', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = ssoCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request.', 400);
    return;
  }

  const payload = verifySsoCallbackToken(parsed.data.token);
  if (!payload) {
    sendResponse(res, null, 'Invalid or expired SSO token.', 401);
    return;
  }

  try {
    const user = await User.findById(payload.id).select(
      '+tenantId +tokenVersion +email +name +roles +role +siteId +active',
    );

    if (!user || user.active === false) {
      sendResponse(res, null, 'User is disabled', 403);
      return;
    }

    const userTenantId = toStringId(user.tenantId);
    if (userTenantId && payload.tenantId && userTenantId !== payload.tenantId) {
      sendResponse(res, null, 'Invalid tenant for user', 403);
      return;
    }

    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      sendResponse(res, null, 'Server configuration issue', 500);
      return;
    }

    const authUser = toAuthUser(user);
    const emailForToken = typeof authUser.email === 'string' ? authUser.email : user.email ?? '';
    const token = jwt.sign(
      {
        id: authUser.id,
        email: emailForToken,
        tenantId: authUser.tenantId,
        tokenVersion: user.tokenVersion,
        session: buildSessionBinding(req),
      },
      secret,
      { expiresIn: TOKEN_TTL },
    );

    await recordAuthEvent({
      user,
      action: 'sso_callback_success',
      tenantId: authUser.tenantId,
      details: { provider: payload.provider },
    });

    sendAuthSuccess(res, authUser, token, false, { redirect: payload.redirect });
  } catch (err) {
    logger.error('SSO callback error:', err);
    next(err);
  }
});

router.post('/bootstrap/rotate', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = bootstrapRotationSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  const rotation = decodeRotationToken(parsed.data.rotationToken);
  if (!rotation?.id) {
    sendResponse(res, null, 'Invalid or expired rotation token', 401);
    return;
  }

  const passwordCheck = validatePasswordStrength(parsed.data.newPassword);
  if (!passwordCheck.valid) {
    sendResponse(res, null, passwordCheck.errors, 400);
    return;
  }

  try {
    const user = await User.findById(rotation.id).select(
      '+passwordExpired +bootstrapAccount +mfaSecret +tenantId +tokenVersion',
    );
    if (!user || (!user.passwordExpired && !user.bootstrapAccount)) {
      sendResponse(res, null, 'Rotation not required for this account', 400);
      return;
    }

    if (!user.mfaSecret) {
      sendResponse(res, null, 'MFA secret not initialized', 400);
      return;
    }

    const mfaValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: parsed.data.mfaToken,
      window: 1,
    });

    if (!mfaValid) {
      sendResponse(res, null, 'Invalid MFA token', 400);
      return;
    }

    user.passwordHash = parsed.data.newPassword;
    user.passwordExpired = false;
    user.bootstrapAccount = false;
    user.mfaEnabled = true;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    await writeAuditLog({
      tenantId: user.tenantId,
      userId: user._id,
      action: 'bootstrap_rotation',
      entityType: 'user',
      entityId: user._id.toString(),
      before: { passwordExpired: true, bootstrapAccount: true },
      after: {
        passwordExpired: user.passwordExpired,
        bootstrapAccount: user.bootstrapAccount,
        mfaEnabled: user.mfaEnabled,
      },
    });

    sendResponse(res, { rotated: true }, null, 200, 'Password rotated');
  } catch (err) {
    logger.error('Bootstrap rotation error', err);
    next(err);
  }
});

router.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = await registerBodySchema.safeParseAsync(req.body);
  if (!parsed.success) {
    sendResponse(res, null, 'Invalid request', 400);
    return;
  }

  const passwordCheck = validatePasswordStrength(parsed.data.password);
  if (!passwordCheck.valid) {
    sendResponse(res, null, passwordCheck.errors, 400);
    return;
  }

  const { name, email, password, tenantId, employeeId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedTenant = tenantId ?? resolveRequestTenant(req);

  try {
    if (!resolvedTenant) {
      sendResponse(res, null, 'Tenant is required', 400);
      return;
    }

    if (tenantId && resolvedTenant !== tenantId) {
      sendResponse(res, null, 'Cross-tenant registration is not allowed', 403);
      return;
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      sendResponse(res, null, 'Email already in use', 400);
      return;
    }

    const user = new User({
      name,
      email: normalizedEmail,
      passwordHash: password,
      tenantId: resolvedTenant,
      employeeId,
    });

    await user.save();

    sendResponse(
      res,
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        tenantId: user.tenantId?.toString(),
        employeeId: user.employeeId,
      },
      null,
      201,
      'User registered successfully',
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      sendResponse(res, null, 'Email or employee ID already in use', 400);
      return;
    }

    logger.error('Register error:', err);
    next(err);
  }
});

router.get('/oauth/:provider', async (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    sendResponse(res, null, 'Unsupported provider', 400);
    return;
  }

  const redirect = getRequestedRedirect(req);
  const state = signStateToken(redirect);
  if (!state) {
    sendResponse(res, null, 'Unable to initiate SSO', 500);
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const auth = passport.authenticate(provider, {
        scope: getOAuthScope(provider),
        state,
      });
      auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/oidc/:provider/metadata', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('oidc')) {
    sendResponse(res, null, 'OIDC is disabled', 404);
    return;
  }

  const provider = req.params.provider as OIDCProvider;
  const config = OIDC_PROVIDER_CONFIGS.find((item) => item.name === provider);
  if (!config) {
    sendResponse(res, null, 'Unsupported provider', 400);
    return;
  }

  sendResponse(
    res,
    {
      issuer: config.issuer,
      authorizationEndpoint: config.authorizationUrl ?? `${config.issuer.replace(/\/$/, '')}/authorize`,
      tokenEndpoint: config.tokenUrl ?? `${config.issuer.replace(/\/$/, '')}/token`,
      callbackPath: config.callbackPath,
    },
    null,
    200,
    'OIDC metadata',
  );
});

router.get('/oidc/:provider', async (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider;
  const allowed = await isAllowedOidcProvider(provider);
  if (!allowed) {
    sendResponse(res, null, 'Unsupported provider', 400);
    return;
  }

  if (!isStaticOidcProvider(provider)) {
    sendResponse(
      res,
      { provider },
      null,
      202,
      'OIDC provider registered but no passport strategy bound',
    );
    return;
  }

  const redirect = getRequestedRedirect(req);
  const state = signStateToken(redirect);
  if (!state) {
    sendResponse(res, null, 'Unable to initiate SSO', 500);
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const auth = passport.authenticate(provider, {
        scope: ['openid', 'profile', 'email'],
        state,
      });
      auth(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/saml/:tenantId/metadata', async (req: Request, res: Response) => {
  if (!isFeatureEnabled('saml')) {
    sendResponse(res, null, 'SAML is disabled', 404);
    return;
  }

  try {
    const metadata = await getSamlMetadata(req.params.tenantId);
    res.type('application/xml').send(metadata);
  } catch (err) {
    logger.error('Failed to build SAML metadata', err);
    sendResponse(res, null, 'Unable to generate SAML metadata', 500);
  }
});

router.post('/saml/:tenantId/acs', async (req: Request, res: Response, next: NextFunction) => {
  if (!isFeatureEnabled('saml')) {
    res.status(404).json({ message: 'SAML is not enabled' });
    return;
  }

  const { tenantId } = req.params;
  try {
    const assertion = samlResponseHandler(req);
    const { user } = await provisionUserFromIdentity(
      {
        tenantId,
        email: assertion.email,
        name: assertion.name,
        roles: assertion.roles,
        skipMfa: SECURITY_POLICY.mfa.optionalForSso,
      },
      { force: true },
    );

    if (!user.active) {
      sendResponse(res, null, 'User is disabled', 403);
      return;
    }

    await recordAuthEvent({
      user,
      action: 'saml_login_success',
      details: { relayState: assertion.relayState },
    });

    const redirect = sanitizeRedirect(assertion.relayState);
    const ssoToken = signSsoCallbackToken({
      id: user._id.toString(),
      tenantId,
      siteId: toStringId(user.siteId),
      redirect,
      provider: 'saml',
    });
    if (!ssoToken) {
      sendResponse(res, null, 'Server configuration issue', 500);
      return;
    }

    const redirectUrl = buildFrontendCallbackUrl(ssoToken);

    sendResponse(
      res,
      {
        redirectUrl,
      },
      null,
      200,
      'SAML assertion accepted',
    );
  } catch (err) {
    next(err);
  }
});
router.get('/saml/:tenantId/redirect', samlRedirectPlaceholder);

const handlePassportCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
  provider: string,
) => {
  const processCallback = async (err: Error | null, user: unknown) => {
    try {
      if (err || !user) {
        if (err) {
          logger.error(`OAuth ${provider} callback error:`, err);
        }
        sendResponse(res, null, 'Authentication failed', 400);
        return;
      }

      const email = (user as { email?: unknown }).email;
      assertEmail(email);

      const tenantId = toStringId((user as { tenantId?: unknown }).tenantId);
      const siteId = toStringId((user as { siteId?: unknown }).siteId);
      const roles = extractPassportRoles(user);

      if (!tenantId) {
        sendResponse(res, null, 'Tenant resolution failed for SSO user', 400);
        return;
      }

      const { user: provisionedUser, created } = await provisionUserFromIdentity(
        {
          tenantId,
          email,
          roles,
          siteId,
          name: (user as { name?: string }).name,
          skipMfa: SECURITY_POLICY.mfa.optionalForSso,
        },
        { force: true },
      );

      if (!provisionedUser.active) {
        sendResponse(res, null, 'User is disabled', 403);
        return;
      }

      const statePayload = verifyStateToken(
        typeof req.query.state === 'string' ? req.query.state : undefined,
      );
      if (!statePayload) {
        sendResponse(res, null, 'Invalid state parameter', 400);
        return;
      }

      const ssoToken = signSsoCallbackToken({
        id: provisionedUser._id.toString(),
        tenantId,
        siteId: toStringId(provisionedUser.siteId) ?? siteId,
        redirect: statePayload.redirect,
        provider,
      });
      if (!ssoToken) {
        sendResponse(res, null, 'Server configuration issue', 500);
        return;
      }

      void recordAuthEvent({
        action: 'sso_login_success',
        tenantId,
        user: provisionedUser,
        details: { provider, email, roles: provisionedUser.roles, created },
      });

      const redirectUrl = buildFrontendCallbackUrl(ssoToken);
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  };

  passport.authenticate(
    provider,
    { session: false },
    (err: Error | null, user: unknown) => {
      void processCallback(err, user);
    },
  )(req, res, next);
};

router.get(
  '/oauth/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider as OAuthProvider;
    if (!OAUTH_PROVIDERS.includes(provider)) {
      sendResponse(res, null, 'Unsupported provider', 400);
      return;
    }

    try {
      handlePassportCallback(req, res, next, provider);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/oidc/:provider/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const provider = req.params.provider;
    const allowed = await isAllowedOidcProvider(provider);
    if (!allowed) {
      sendResponse(res, null, 'Unsupported provider', 400);
      return;
    }

    if (!isStaticOidcProvider(provider)) {
      sendResponse(
        res,
        { provider },
        null,
        202,
        'OIDC provider registered but callback handling is not configured',
      );
      return;
    }

    try {
      handlePassportCallback(req, res, next, provider);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', validateMfaToken);

router.get('/me', requireAuth, me);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

export default router;
