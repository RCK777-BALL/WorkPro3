/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import http from '@/lib/http';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tenantId: '',
    employeeId: '',
  });
  const [error, setError] = useState('');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const promptInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await http.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(t('auth.registrationFailed', 'Registration failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-4 bg-[var(--wp-color-surface)] p-6 rounded shadow">
        {showInstall && (
          <div className="flex justify-center">
            <button
              onClick={promptInstall}
              type="button"
              className="mb-2 px-4 py-2 rounded bg-primary-600 text-[var(--wp-color-text)]"
            >
              {t('app.install', 'Install App')}
            </button>
          </div>
        )}

        <h2 className="text-xl font-bold">{t('auth.register', 'Register')}</h2>

        <input
          type="text"
          name="name"
          placeholder={t('auth.name', 'Name')}
          value={form.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          autoComplete="name"
          required
        />
        <input
          type="email"
          name="email"
          placeholder={t('auth.email', 'Email')}
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          autoComplete="email"
          required
        />
        <input
          type="password"
          name="password"
          placeholder={t('auth.password', 'Password')}
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          autoComplete="new-password"
          required
        />
        <input
          type="text"
          name="tenantId"
          placeholder={t('auth.tenantId', 'Tenant ID')}
          value={form.tenantId}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="employeeId"
          placeholder={t('auth.employeeId', 'Employee ID')}
          value={form.employeeId}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        {error && <div className="text-red-500">{error}</div>}

        <button type="submit" className="bg-primary-600 text-[var(--wp-color-text)] px-4 py-2 rounded w-full">
          {t('auth.register', 'Register')}
        </button>

        <p className="text-sm text-center">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="text-primary-600">
            {t('auth.login', 'Login')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;

