/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import type { AuthRole, AuthUser } from '@/types';
import {
  FALLBACK_TOKEN_KEY,
  SITE_KEY,
  TENANT_KEY,
  TOKEN_KEY,
  USER_STORAGE_KEY,
} from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const sanitizeRedirect = (value: string | null): string => {
  if (!value || !value.startsWith('/')) {
    return '/dashboard';
  }
  if (value.startsWith('/login')) {
    return '/dashboard';
  }
  return value;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = useMemo(() => sanitizeRedirect(new URLSearchParams(location.search).get('redirect')), [location.search]);
  const stateQuery = `?state=${encodeURIComponent(redirectTarget)}`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) return;

    const emailParam = params.get('email');
    const tenantId = params.get('tenantId') || undefined;
    const siteId = params.get('siteId') || undefined;
    const rolesParam = params.get('roles');
    const roles = rolesParam
      ? (rolesParam
          .split(',')
          .map((role) => role.trim().toLowerCase())
          .filter(Boolean) as AuthRole[])
      : [];
    const primaryRole = (roles[0] ?? 'tech') as AuthRole;
    const userId = params.get('userId') || emailParam || 'sso-user';
    const normalizedEmail = emailParam && emailParam.includes('@') ? emailParam : `${userId}@workspace.local`;
    const user: AuthUser = {
      id: userId,
      name: normalizedEmail.split('@')[0] ?? normalizedEmail,
      email: normalizedEmail,
      role: primaryRole,
      roles: roles.length > 0 ? Array.from(new Set<AuthRole>(roles)) : [primaryRole],
      ...(tenantId ? { tenantId } : {}),
      ...(siteId ? { siteId } : {}),
    };

    safeLocalStorage.setItem(TOKEN_KEY, token);
    safeLocalStorage.setItem(FALLBACK_TOKEN_KEY, token);
    if (tenantId) {
      safeLocalStorage.setItem(TENANT_KEY, tenantId);
    } else {
      safeLocalStorage.removeItem(TENANT_KEY);
    }
    if (siteId) {
      safeLocalStorage.setItem(SITE_KEY, siteId);
    } else {
      safeLocalStorage.removeItem(SITE_KEY);
    }
    safeLocalStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setUser(user);
    const redirect = sanitizeRedirect(params.get('redirect'));
    navigate(redirect, { replace: true });
  }, [location.search, navigate, setUser]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await authLogin(email, password);

      if ('rotationRequired' in result && result.rotationRequired) {
        navigate('/admin/setup', {
          state: {
            rotationToken: result.rotationToken,
            mfaSecret: result.mfaSecret,
            email: result.email,
          },
        });
        toast('Password rotation required before continuing.', { icon: '🔒' });
        return;
      }

      if ('mfaRequired' in result && result.mfaRequired) {
        toast('Multi-factor authentication required. Please complete the MFA challenge.', {
          icon: '🔐',
        });
        return;
      }

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err instanceof Error ? err.message : 'Login failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--wp-color-background)]">
      <div className="w-96 space-y-6 rounded-lg bg-zinc-900 p-6 text-[var(--wp-color-text)]">
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="text-center text-lg font-medium">Access your command center</h2>
          <input
            className="w-full rounded bg-zinc-800 p-2 text-[var(--wp-color-text)]"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <input
            className="w-full rounded bg-zinc-800 p-2 text-[var(--wp-color-text)]"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo-600 p-2 text-[var(--wp-color-text)] hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = `/api/auth/oauth/google${stateQuery}`;
            }}
            className="w-full rounded border border-white/20 p-2 text-sm font-medium hover:bg-[var(--wp-color-surface)]/10"
          >
            Continue with Google Workspace
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/api/auth/oidc/azure${stateQuery}`;
            }}
            className="w-full rounded border border-white/20 p-2 text-sm font-medium hover:bg-[var(--wp-color-surface)]/10"
          >
            Continue with Azure AD
          </button>
        </div>
      </div>
    </div>
  );
}

