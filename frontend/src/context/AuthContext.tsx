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
import {
  FALLBACK_TOKEN_KEY,
  SITE_KEY,
  TENANT_KEY,
  TOKEN_KEY,
  USER_STORAGE_KEY,
} from '@/lib/http';
import { emitToast } from './ToastContext';
import { api, getErrorMessage } from '@/lib/api';

type RawAuthUser = {
  id: string;
  email?: string | null;
  tenantId?: string;
  siteId?: string;
  role?: string;
};

const allowedRoles: AuthUser['role'][] = [
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'planner',
  'tech',
];

const mapRole = (role?: string): AuthUser['role'] => {
  if (role && allowedRoles.includes(role as AuthUser['role'])) {
    return role as AuthUser['role'];
  }
  return 'general_manager';
};

const toAuthUser = (payload: RawAuthUser): AuthUser => {
  const fallbackEmail = `${payload.id}@unknown.local`;
  const rawEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
  const email = rawEmail || fallbackEmail;
  const nameSource = rawEmail || payload.id;
  const user: AuthUser = {
    id: payload.id,
    email,
    name: typeof nameSource === 'string' && nameSource.includes('@')
      ? nameSource.split('@')[0] ?? nameSource
      : nameSource,
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
  'general_manager',
  'assistant_general_manager',
  'operations_manager',
  'department_leader',
  'assistant_department_leader',
  'area_leader',
  'team_leader',
  'team_member',
  'technical_team_member',
  'admin',
  'supervisor',
  'manager',
  'planner',
  'tech',
  'technician',
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

const persistAuthStorage = (user: AuthUser | null, token?: string) => {
  if (!user) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(FALLBACK_TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(SITE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(FALLBACK_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(FALLBACK_TOKEN_KEY);
  }

  if (user.tenantId) {
    localStorage.setItem(TENANT_KEY, user.tenantId);
  } else {
    localStorage.removeItem(TENANT_KEY);
  }

  if (user.siteId) {
    localStorage.setItem(SITE_KEY, user.siteId);
  } else {
    localStorage.removeItem(SITE_KEY);
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const clearAuthStorage = () => persistAuthStorage(null);

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

      const storedToken =
        localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(FALLBACK_TOKEN_KEY);
      if (!storedToken) {
        if (!cancelled) {
          handleSetUser(null);
          clearAuthStorage();
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get<{ data?: { user?: RawAuthUser | null } }>('/auth/me');
        if (!cancelled) {
          const payload = data?.data?.user;
          handleSetUser(payload ? toAuthUser(payload) : null);
        }
      } catch (err) {
        const message = getErrorMessage(err);
        if (!cancelled && message) {
          clearAuthStorage();
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
      const response = await api.post<unknown>('/auth/login', {
        email,
        password,
        remember,
        username: email,
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
      const hasExplicitAuthShape =
        typeof rawUserRecord.email === 'string' &&
        (('name' in rawUserRecord && 'role' in rawUserRecord) || 'roles' in rawUserRecord);

      const userInput = hasExplicitAuthShape
        ? (rawUserRecord as AuthUserInput)
        : toAuthUser(rawUserRecord as unknown as RawAuthUser);

      const normalizedUser = normalizeAuthUser(userInput);

      const session: AuthSession = {
        user: normalizedUser,
        ...(token ? { token } : {}),
      };

      handleSetUser(normalizedUser);

      persistAuthStorage(normalizedUser, session.token);

      return session;
    },
    [handleSetUser]
  );

  const resetAuthState = useCallback(() => {
    handleSetUser(null);
    clearAuthStorage();
    storeLogout();
  }, [handleSetUser, storeLogout]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
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

