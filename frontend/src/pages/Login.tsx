/*
 * SPDX-License-Identifier: MIT
 */

 
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import http from '../lib/http';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const Login: React.FC = () => {
  const { t } = useTranslation();

  // Auth & MFA state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [mfaUser, setMfaUser] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // PWA install prompt state
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const emailFromOauth = params.get('email');
    if (token && emailFromOauth) {
       const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}`;
      setUser({
        id,
        name: emailFromOauth.split('@')[0],
        role: 'viewer',
        email: emailFromOauth,
 
        token,
      });
      navigate('/dashboard');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, [navigate, setUser]);

  const promptInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await http.post('/auth/login', { email, password });
      if (data.mfaRequired) {
        setMfaUser(data.userId);
        return;
      }
      setUser({ ...data.user, token: data.token });
      localStorage.setItem('auth:token', data.token);
      if (data.user?.tenantId) localStorage.setItem('auth:tenantId', data.user.tenantId);
      if (data.user?.siteId) localStorage.setItem('auth:siteId', data.user.siteId);
      navigate('/dashboard');
    } catch (err: any) {
       console.error(err);
      const isNetworkError =
        err?.code === 'ERR_NETWORK' ||
        err?.message?.toLowerCase().includes('network');
      setError(
        isNetworkError
          ? t('auth.networkError', 'Cannot connect to server')
          : t('auth.loginFailed', 'Login failed')
      );
 
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaUser) return;
    try {
      const { data } = await http.post('/auth/mfa/verify', {
        userId: mfaUser,
        token: code,
      });
      setUser({ ...data.user, token: data.token });
      localStorage.setItem('auth:token', data.token);
      if (data.user?.tenantId) localStorage.setItem('auth:tenantId', data.user.tenantId);
      if (data.user?.siteId) localStorage.setItem('auth:siteId', data.user.siteId);
      navigate('/dashboard');
    } catch {
      setError(t('auth.invalidCode', 'Invalid code'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="space-y-4 w-full max-w-md">
        {showInstall && (
          <div className="flex justify-center">
            <button
              onClick={promptInstall}
              className="mb-4 px-4 py-2 rounded bg-primary-600 text-white"
            >
              {t('app.install', 'Install App')}
            </button>
          </div>
        )}

        {!mfaUser ? (
          <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold">{t('auth.login', 'Login')}</h2>
            <input
              type="email"
              placeholder={t('auth.email', 'Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder={t('auth.password', 'Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              autoComplete="current-password"
              required
            />
            {error && <div className="text-red-500">{error}</div>}
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded w-full">
              {t('auth.login', 'Login')}
            </button>

            {/* OAuth shortcuts */}
            <div className="flex flex-col space-y-2 pt-2">
              <a href="/api/auth/oauth/google" className="text-primary-600">
                {t('auth.loginWithGoogle', 'Login with Google')}
              </a>
              <a href="/api/auth/oauth/github" className="text-primary-600">
                {t('auth.loginWithGitHub', 'Login with GitHub')}
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold">{t('auth.mfaVerification', 'MFA Verification')}</h2>
            <input
              type="text"
              placeholder={t('auth.oneTimeCode', 'One-time code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 border rounded"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            {error && <div className="text-red-500">{error}</div>}
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded w-full">
              {t('auth.verify', 'Verify')}
            </button>
          </form>
        )}

        <div className="flex justify-between text-sm">
          <Link to="/register" className="text-primary-600">
            {t('auth.register', 'Register')}
          </Link>
          <Link to="/forgot-password" className="text-primary-600">
            {t('auth.forgotPassword', 'Forgot Password?')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
 
