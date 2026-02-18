/* eslint-disable react-refresh/only-export-components */
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
import { useInRouterContext, useLocation } from 'react-router-dom';
import { useAuthStore, type AuthState } from '@/store/authStore';
import type { AuthLoginResponse, AuthRole, AuthSession, AuthUser } from '@/types';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { emitToast } from './ToastContext';
import { api, getErrorMessage } from '@/lib/api';
import { clearAuthToken, getAuthToken, hydrateAuthToken, setAuthToken } from '@/utils/secureAuthStorage';

const TOKEN_KEY = 'auth:token';
const TENANT_KEY = 'auth:tenantId';
const SITE_KEY = 'auth:siteId';
const FALLBACK_TOKEN_KEY = 'token';
const USER_STORAGE_KEY = 'user';

type RawAuthUser = {
  id: string;
  email?: string | null;
  tenantId?: string;
  siteId?: string;
  roles?: string[];
  role?: string;
  permissions?: string[];
};

const AUTH_ROUTE_PREFIXES = ['/login', '/register', '/forgot'];

const allowedRoles: AuthUser['role'][] = [
  'global_admin',
  'plant_admin',
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

const getWindowPathname = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.pathname ?? '/';
  }
  return '/';
};

let hasLoggedRouterFallback = false;

const useSafeLocation = (): ReturnType<typeof useLocation> | null => {
  if (useInRouterContext()) {
    return useLocation();
  }

  if (process.env.NODE_ENV !== 'production' && !hasLoggedRouterFallback) {
    // eslint-disable-next-line no-console -- surfaced only in non-production environments for debugging
    console.warn(
      'AuthProvider is rendering outside of a Router context. Falling back to window.location.',
    );
    hasLoggedRouterFallback = true;
  }

  return null;
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

  if (Array.isArray(payload.permissions)) {
    user.permissions = payload.permissions;
  }

  return user;
};

type AuthUserInput =
  | (AuthUser & { roles?: unknown; permissions?: unknown })
  | (Omit<AuthUser, 'role'> & { role?: unknown; roles?: unknown; permissions?: unknown });

const ROLE_PRIORITY: AuthRole[] = [
  'global_admin',
  'plant_admin',
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

const normalizePermissions = (permissions: unknown): string[] => {
  if (!permissions) return [];
  const list = Array.isArray(permissions) ? permissions : [permissions];
  const normalized: string[] = [];

  for (const permission of list) {
    let raw: string | undefined;

    if (typeof permission === 'string') {
      raw = permission;
    } else if (permission && typeof permission === 'object' && 'permission' in permission) {
      const candidate = (permission as { permission?: unknown }).permission;
      if (typeof candidate === 'string') {
        raw = candidate;
      }
    }

    if (!raw) continue;

    const candidate = raw.toLowerCase();
    if (!normalized.includes(candidate)) {
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
  const permissions = normalizePermissions((user as { permissions?: unknown }).permissions);
  return {
    ...(user as Record<string, unknown>),
    role: primaryRole,
    roles,
    permissions,
  } as AuthUser;
};

const persistAuthStorage = (user: AuthUser | null, token?: string) => {
  if (!user) {
    void clearAuthToken();
    safeLocalStorage.removeItem(TENANT_KEY);
    safeLocalStorage.removeItem(SITE_KEY);
    safeLocalStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  if (token) {
    void setAuthToken(token);
  } else {
    void clearAuthToken();
  }

  if (user.tenantId) {
    safeLocalStorage.setItem(TENANT_KEY, user.tenantId);
  } else {
    safeLocalStorage.removeItem(TENANT_KEY);
  }

  if (user.siteId) {
    safeLocalStorage.setItem(SITE_KEY, user.siteId);
  } else {
    safeLocalStorage.removeItem(SITE_KEY);
  }

  safeLocalStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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
  completeAuthSession: (session: { user: unknown; token?: string | undefined }) => void;
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
  const location = useSafeLocation();

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

  const pathname = location?.pathname ?? getWindowPathname();
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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

      await hydrateAuthToken();
      const storedToken =
        (await getAuthToken()) ??
        safeLocalStorage.getItem(TOKEN_KEY) ??
        safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
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
        const { data } = await api.get<{ user?: RawAuthUser | null }>('/auth/me');
        if (!cancelled) {
          const payload = data?.user;
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
  }, [handleSetUser, isAuthRoute, pathname]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const response = await api.post<unknown>('/auth/login', {
        email,
        password,
        remember,
        username: email,
      });

      const payload = response.data;

      const rotationSource = (() => {
        if (!payload || typeof payload !== 'object') return null;
        const candidate =
          'data' in payload && typeof (payload as { data?: unknown }).data === 'object'
            ? (payload as { data?: unknown }).data
            : payload;
        return (candidate as { rotationRequired?: unknown }).rotationRequired ? candidate : null;
      })();

      if (rotationSource) {
        return rotationSource as AuthLoginResponse;
      }

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
          return (payload as { data?: { user?: unknown; token?: string; rotationRequired?: boolean } }).data;
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

  const completeAuthSession = useCallback((session: { user: unknown; token?: string }) => {
    if (!session?.user || typeof session.user !== 'object') {
      throw new Error('Invalid auth session user payload');
    }

    const rawUserRecord = session.user as Record<string, unknown>;
    const hasExplicitAuthShape =
      typeof rawUserRecord.email === 'string' &&
      (('name' in rawUserRecord && 'role' in rawUserRecord) || 'roles' in rawUserRecord);

    const userInput = hasExplicitAuthShape
      ? (rawUserRecord as AuthUserInput)
      : toAuthUser(rawUserRecord as unknown as RawAuthUser);

    const normalizedUser = normalizeAuthUser(userInput);
    handleSetUser(normalizedUser);
    persistAuthStorage(normalizedUser, session.token);
  }, [handleSetUser]);

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
      value={{
        user,
        setUser: handleSetUser,
        login,
        logout,
        completeAuthSession,
        resetAuthState,
        loading,
      }}
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

