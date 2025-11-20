/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { api, getErrorMessage } from '@/lib/api';

type LocationState = {
  rotationToken?: string;
  mfaSecret?: string;
  email?: string | null;
};

export function BootstrapSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const newPasswordId = 'bootstrap-new-password';
  const confirmPasswordId = 'bootstrap-confirm-password';
  const mfaTokenId = 'bootstrap-mfa-token';

  const rotationToken = state.rotationToken ?? '';
  const mfaSecret = state.mfaSecret ?? '';
  const email = state.email ?? 'bootstrap administrator';

  const isReady = useMemo(() => rotationToken.length > 0 && mfaSecret.length > 0, [rotationToken, mfaSecret]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isReady) {
      toast.error('Rotation link is missing. Please start from the login page.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/bootstrap/rotate', {
        rotationToken,
        newPassword,
        mfaToken,
      });
      toast.success('Password rotated and MFA verified. You can sign in with your new credentials.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Unable to rotate password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-xl space-y-6 rounded-xl bg-slate-900 p-8 shadow-xl shadow-black/40 text-slate-50">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-indigo-200/80">Bootstrap security</p>
          <h1 className="text-2xl font-semibold">Rotate default credentials</h1>
          <p className="text-sm text-slate-300">
            The account {email || 'admin'} is locked until you choose a strong password and enroll multi-factor
            authentication.
          </p>
        </div>

        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
          <p className="text-sm font-medium text-indigo-100">Step 1: add your MFA secret to an authenticator app</p>
          <p className="mt-2 text-xs text-indigo-100/80">Secret</p>
          <div className="mt-1 rounded border border-indigo-400/40 bg-black/30 p-2 font-mono text-sm tracking-widest">
            {mfaSecret || 'secret-not-provided'}
          </div>
          <p className="mt-2 text-xs text-indigo-100/70">
            Enter the 6-digit code from your authenticator when verifying below.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-200" htmlFor={newPasswordId}>
              New password
            </label>
            <input
              id={newPasswordId}
              type="password"
              className="mt-1 w-full rounded bg-slate-800 p-3 text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={12}
            />
            <p className="mt-1 text-xs text-slate-400">
              Use at least 12 characters with upper, lower, number, and symbol.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200" htmlFor={confirmPasswordId}>
              Confirm password
            </label>
            <input
              id={confirmPasswordId}
              type="password"
              className="mt-1 w-full rounded bg-slate-800 p-3 text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200" htmlFor={mfaTokenId}>
              MFA code
            </label>
            <input
              id={mfaTokenId}
              type="text"
              className="mt-1 w-full rounded bg-slate-800 p-3 text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={mfaToken}
              onChange={(event) => setMfaToken(event.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="Enter the 6-digit code"
            />
          </div>

          <button
            type="submit"
            disabled={!isReady || submitting}
            className="flex w-full items-center justify-center rounded bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Completing setup…' : 'Complete rotation'}
          </button>

          {!isReady && (
            <p className="text-center text-xs text-amber-200">
              This page requires the rotation link from the login flow. Restart login to obtain a fresh token.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default BootstrapSetupPage;
