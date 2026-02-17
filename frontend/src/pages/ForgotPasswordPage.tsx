/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import http from '@/lib/http';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
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
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await http.post('/auth/password/reset', { email });
      setMessage(t('auth.resetLinkSent'));
    } catch (err) {
      console.error(err);
      setMessage(t('auth.resetFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-4">
        {showInstall && (
          <div className="flex justify-center">
            <button
              onClick={promptInstall}
              type="button"
              className="mb-4 px-4 py-2 rounded bg-primary-600 text-[var(--wp-color-text)]"
            >
              {t('app.install')}
            </button>
          </div>
        )}
        <h2 className="text-xl font-bold">{t('auth.resetPassword')}</h2>
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="email"
        />
        {message && <div className="text-green-600">{message}</div>}
        <button type="submit" className="bg-primary-600 text-[var(--wp-color-text)] px-4 py-2 rounded w-full">
          {t('auth.sendResetLink')}
        </button>
        <p className="text-sm text-center">
          <Link to="/login" className="text-primary-600">{t('auth.backToLogin')}</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;

