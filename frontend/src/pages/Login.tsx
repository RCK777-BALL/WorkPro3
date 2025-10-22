/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@cmms.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await authLogin(email, password);

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
