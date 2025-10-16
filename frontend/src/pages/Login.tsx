/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types';
import { FALLBACK_TOKEN_KEY, SITE_KEY, TENANT_KEY, TOKEN_KEY, USER_STORAGE_KEY } from '@/lib/http';

export default function Login() {
  const [email, setEmail] = useState('admin@cmms.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data ?? {};

      if (!token || !user) {
        throw new Error('Invalid login response');
      }

      const normalizedUser = user as AuthUser;

      localStorage.setItem(FALLBACK_TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));

      if (normalizedUser.tenantId) {
        localStorage.setItem(TENANT_KEY, normalizedUser.tenantId);
      } else {
        localStorage.removeItem(TENANT_KEY);
      }

      if (normalizedUser.siteId) {
        localStorage.setItem(SITE_KEY, normalizedUser.siteId);
      } else {
        localStorage.removeItem(SITE_KEY);
      }

      setUser(normalizedUser);

      toast.success('Login successful!');
      window.location.href = '/dashboard';
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
    <div className="flex h-screen items-center justify-center bg-black">
      <form onSubmit={handleLogin} className="w-80 space-y-4 rounded-lg bg-zinc-900 p-6">
        <h2 className="text-center text-lg font-medium text-white">Access your command center</h2>
        <input
          className="w-full rounded bg-zinc-800 p-2 text-white"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
        />
        <input
          className="w-full rounded bg-zinc-800 p-2 text-white"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
