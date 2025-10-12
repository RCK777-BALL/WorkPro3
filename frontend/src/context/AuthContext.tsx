/*
 * SPDX-License-Identifier: MIT
 */

// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { useAuthStore, type AuthState } from '@/store/authStore';
import type {
  AuthLoginMfaChallenge,
  AuthLoginResponse,
  AuthMeResponse,
  AuthSession,
  AuthUser,
} from '@/types';
import http, { SITE_KEY, TENANT_KEY, TOKEN_KEY } from '@/lib/http';
import { emitToast } from './ToastContext';

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  login: (
    email: string,
    password: string,
  ) => Promise<AuthSession | AuthLoginMfaChallenge>;
  logout: () => Promise<void>;
  /**
   * Clears all authentication state without making a network request.
   * Useful when the server responds with 401 and we need to locally
   * invalidate the session without triggering another unauthorized
   * response loop.
   */
  resetAuthState: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setStoreUser = useAuthStore((state: AuthState) => state.setUser);
  const storeLogout = useAuthStore((state: AuthState) => state.logout);

  const handleSetUser = useCallback(
    (u: AuthUser | null) => {
      setUser(u);
      setStoreUser(u);
    },
    [setStoreUser]
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await http.get<AuthMeResponse>('/auth/me');
        handleSetUser(data?.user ?? null);
      } catch {
        handleSetUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
    // handleSetUser is intentionally omitted from the dependency array to
    // avoid re-fetching on every render when it updates state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await http.post<AuthLoginResponse>('/auth/login', { email, password });

      if ('mfaRequired' in data && data.mfaRequired) {
        emitToast('Multi-factor authentication is required to log in.', 'error');
        return data;
      }

      const session: AuthSession = data;
      handleSetUser(session.user);
      if (session.token) {
        localStorage.setItem(TOKEN_KEY, session.token);
      }
      if (session.user?.tenantId) {
        localStorage.setItem(TENANT_KEY, session.user.tenantId);
      }
      if (session.user?.siteId) {
        localStorage.setItem(SITE_KEY, session.user.siteId);
      }
      return session;
    },
    [handleSetUser]
  );

  const resetAuthState = useCallback(() => {
    handleSetUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(SITE_KEY);
    storeLogout();
  }, [handleSetUser, storeLogout]);

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        emitToast('Failed to log out', 'error');
      }
    } finally {
      resetAuthState();
    }

  }, [resetAuthState]);

  return (
    <AuthContext.Provider
      value={{ user, setUser: handleSetUser, login, logout, resetAuthState, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

