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
import type { AuthLoginResponse, AuthRole, AuthSession, AuthUser } from '@/types';
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

const toAuthUser = (payload: RawAuthUser): AuthUser => {
  const user: AuthUser = {
    id: payload.id,
    email: payload.email,
    name: payload.email.split('@')[0] ?? payload.email,
    role: mapRole(payload.role),
  };

  if (payload.tenantId !== undefined) {
    user.tenantId = payload.tenantId;
  }

  if (payload.siteId !== undefined) {
    user.siteId = payload.siteId;
  }

  return user;
};

type AuthUserInput =
  | (AuthUser & { roles?: unknown })
  | (Omit<AuthUser, 'role'> & { role?: unknown; roles?: unknown });

const ROLE_PRIORITY: AuthRole[] = [
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
  'team_leader',
  'team_member',
  'area_leader',
  'department_leader',
  'viewer',
];

const normalizeRoles = (roles: unknown): AuthRole[] => {
  if (!roles) return [];
  const list = Array.isArray(roles) ? roles : [roles];
  const normalized: AuthRole[] = [];
  for (const role of list) {
    if (typeof role !== 'string') continue;
    const candidate = role.toLowerCase() as AuthRole;
    if (ROLE_PRIORITY.includes(candidate) && !normalized.includes(candidate)) {
      normalized.push(candidate);
    }
  }
  return normalized;
};

const derivePrimaryRole = (role: unknown, roles: AuthRole[]): AuthRole => {
  if (typeof role === 'string') {
    const candidate = role.toLowerCase() as AuthRole;
    if (ROLE_PRIORITY.includes(candidate)) {
      return candidate;
    }
  }
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) {
      return candidate;
    }
  }
  return roles[0] ?? 'tech';
};

const normalizeAuthUser = (user: AuthUserInput): AuthUser => {
  const normalizedRoles = normalizeRoles(user.roles);
  const primaryRole = derivePrimaryRole((user as { role?: unknown }).role, normalizedRoles);
  const roles = Array.from(new Set<AuthRole>([primaryRole, ...normalizedRoles]));
  return {
    ...(user as Record<string, unknown>),
    role: primaryRole,
    roles,
  } as AuthUser;
};

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
      const normalized = u ? normalizeAuthUser(u) : null;
      setUser(normalized);
      setStoreUser(normalized);
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
      const response = await api.post<unknown>('/api/auth/login', {
        email,
        password,
        remember,
      });

      const payload = response.data;

      if (
        payload &&
        typeof payload === 'object' &&
        'mfaRequired' in payload &&
        (payload as { mfaRequired?: unknown }).mfaRequired === true
      ) {
        return payload as AuthLoginResponse;
      }

      const sessionSource = (() => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          (payload as { data?: unknown }).data &&
          typeof (payload as { data?: unknown }).data === 'object'
        ) {
          return (payload as { data?: { user?: unknown; token?: string } }).data;
        }
        return payload as { user?: unknown; token?: string };
      })();

      if (!sessionSource || typeof sessionSource !== 'object' || !('user' in sessionSource)) {
        throw new Error('Invalid login response');
      }

      const { user: rawUser, token } = sessionSource as {
        user?: unknown;
        token?: string;
      };

      if (!rawUser || typeof rawUser !== 'object') {
        throw new Error('Invalid login response');
      }

      const rawUserRecord = rawUser as Record<string, unknown>;
      const userInput = (
        ('name' in rawUserRecord && 'role' in rawUserRecord) || 'roles' in rawUserRecord
          ? (rawUserRecord as AuthUserInput)
          : toAuthUser(rawUserRecord as unknown as RawAuthUser)
      ) as AuthUserInput;

      const normalizedUser = normalizeAuthUser(userInput);

      const session: AuthSession = {
        user: normalizedUser,
        ...(token ? { token } : {}),
      };

      handleSetUser(normalizedUser);

      if (session.token) {
        localStorage.setItem(TOKEN_KEY, session.token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }

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

