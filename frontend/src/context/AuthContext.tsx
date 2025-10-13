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
import { useLocation } from 'react-router-dom';
import { useAuthStore, type AuthState } from '@/store/authStore';
import type { AuthLoginResponse, AuthSession, AuthUser } from '@/types';
import { SITE_KEY, TENANT_KEY, TOKEN_KEY } from '@/lib/http';
import { emitToast } from './ToastContext';
import { api, getErrorMessage } from '@/lib/api';

type RawAuthUser = {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
  role?: string;
};

const allowedRoles: AuthUser['role'][] = [
  'admin',
  'supervisor',
  'planner',
  'tech',
  'team_member',
  'team_leader',
  'area_leader',
  'department_leader',
];

const mapRole = (role?: string): AuthUser['role'] => {
  if (role && allowedRoles.includes(role as AuthUser['role'])) {
    return role as AuthUser['role'];
  }
  return 'admin';
};

const toAuthUser = (payload: RawAuthUser): AuthUser => ({
  id: payload.id,
  email: payload.email,
  name: payload.email.split('@')[0] ?? payload.email,
  role: mapRole(payload.role),
  tenantId: payload.tenantId,
  siteId: payload.siteId,
});

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => Promise<AuthLoginResponse>;
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
  const location = useLocation();

  const setStoreUser = useAuthStore((state: AuthState) => state.setUser);
  const storeLogout = useAuthStore((state: AuthState) => state.logout);

  const handleSetUser = useCallback(
    (u: AuthUser | null) => {
      setUser(u);
      setStoreUser(u);
    },
    [setStoreUser]
  );

  const { pathname } = location;
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot');

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (isAuthRoute) {
        if (!cancelled) {
          handleSetUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get<{ data?: { user?: RawAuthUser | null } }>('/api/auth/me');
        if (!cancelled) {
          const payload = data?.data?.user;
          handleSetUser(payload ? toAuthUser(payload) : null);
        }
      } catch (err) {
        const message = getErrorMessage(err);
        if (!cancelled && message) {
          handleSetUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchUser();

    return () => {
      cancelled = true;
    };
  }, [handleSetUser, isAuthRoute]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const response = await api.post<{ data?: { user?: RawAuthUser } }>('/api/auth/login', {
        email,
        password,
        remember,
      });
      const payload = response.data?.data?.user;
      if (!payload) {
        throw new Error('Invalid login response');
      }

      const authUser = toAuthUser(payload);
      handleSetUser(authUser);

      if (authUser.tenantId) {
        localStorage.setItem(TENANT_KEY, authUser.tenantId);
      }
      if (authUser.siteId) {
        localStorage.setItem(SITE_KEY, authUser.siteId);
      }
      localStorage.removeItem(TOKEN_KEY);

      const session: AuthSession = { user: authUser };
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
      await api.post('/api/auth/logout');
    } catch (err) {
      const message = getErrorMessage(err);
      if (message) {
        emitToast(message, 'error');
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

