/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const sanitizeRedirect = (value: string | null): string => {
  if (!value || !value.startsWith('/')) {
    return '/dashboard';
  }
  if (value.startsWith('/login') || value.startsWith('/auth/callback')) {
    return '/dashboard';
  }
  return value;
};

type SsoCallbackResponse = {
  token?: string;
  user?: unknown;
  redirect?: string;
};

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeAuthSession } = useAuth();
  const [loading, setLoading] = useState(true);

  const ssoToken = useMemo(() => searchParams.get('ssoToken'), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const exchangeToken = async () => {
      if (!ssoToken) {
        toast.error('Missing SSO token.');
        navigate('/login', { replace: true });
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.post<SsoCallbackResponse>('/auth/sso/callback', {
          token: ssoToken,
        });

        if (!data?.user) {
          throw new Error('Invalid SSO response');
        }

        completeAuthSession({ user: data.user, token: data.token });
        const redirect = sanitizeRedirect(data.redirect ?? null);
        if (!cancelled) {
          navigate(redirect, { replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
          navigate('/login', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void exchangeToken();

    return () => {
      cancelled = true;
    };
  }, [completeAuthSession, navigate, ssoToken]);

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <div className="space-y-3 rounded-lg bg-zinc-900 p-6 text-center">
        <p className="text-lg font-medium">Completing sign-in...</p>
        <p className="text-sm text-zinc-400">
          {loading ? 'Verifying your workspace access.' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
