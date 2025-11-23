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
import type { AuthLoginResponse, AuthRole, AuthSession, AuthUser, RoleAssignment } from '@/types';
import {
  FALLBACK_TOKEN_KEY,
  SITE_KEY,
  TENANT_KEY,
  TOKEN_KEY,
  USER_STORAGE_KEY,
} from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { emitToast } from './ToastContext';
import { api, getErrorMessage } from '@/lib/api';

type RawAuthUser = {
  id: string;
  email?: string | null;
  tenantId?: string;
  siteId?: string;
  role?: string;
  permissions?: string[];
  roleAssignments?: RoleAssignment[];
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
  try {
    return useLocation();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedRouterFallback) {
      // eslint-disable-next-line no-console -- surfaced only in non-production environments for debugging
      console.warn(
        'AuthProvider is rendering outside of a Router context. Falling back to window.location.',
        error,
      );
      hasLoggedRouterFallback = true;
    }
    return null;
  }
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

  const permissions = normalizePermissions(payload.permissions);
  if (permissions.length) {
    user.permissions = permissions;
  }

  const roleAssignments = normalizeRoleAssignments(payload.roleAssignments);
  if (roleAssignments.length) {
    user.roleAssignments = roleAssignments;
  }

  return user;
};

type AuthUserInput =
  | (AuthUser & { roles?: unknown; permissions?: unknown; roleAssignments?: unknown })
  | (Omit<AuthUser, 'role'> & { role?: unknown; roles?: unknown; permissions?: unknown; roleAssignments?: unknown });

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
  const values = Array.isArray(permissions) ? permissions : [permissions];
  const normalized: string[] = [];
  for (const permission of values) {
    if (typeof permission !== 'string') continue;
    const trimmed = permission.trim();
    if (trimmed && !normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }
  return normalized;
};

const normalizePermissionGrants = (grants: unknown, tenantId?: string, siteId?: string) => {
  if (!Array.isArray(grants)) return [] as RoleAssignment['permissions'];
  const normalized: NonNullable<RoleAssignment['permissions']> = [];
  for (const grant of grants) {
    if (!grant || typeof grant !== 'object') continue;
    const permission = typeof (grant as { permission?: unknown }).permission === 'string'
      ? (grant as { permission: string }).permission.trim()
      : '';
    if (!permission) continue;
    normalized.push({
      permission,
      tenantId: typeof (grant as { tenantId?: unknown }).tenantId === 'string'
        ? ((grant as { tenantId: string }).tenantId || tenantId || '')
        : tenantId || '',
      siteId:
        typeof (grant as { siteId?: unknown }).siteId === 'string'
          ? (grant as { siteId: string }).siteId || siteId
          : siteId,
      grantedBy:
        typeof (grant as { grantedBy?: unknown }).grantedBy === 'string'
          ? (grant as { grantedBy: string }).grantedBy
          : undefined,
      grantedAt:
        typeof (grant as { grantedAt?: unknown }).grantedAt === 'string'
          ? (grant as { grantedAt: string }).grantedAt
          : undefined,
    });
  }
  return normalized;
};

const normalizeRoleAssignments = (assignments: unknown): RoleAssignment[] => {
  if (!assignments || !Array.isArray(assignments)) return [];
  const normalized: RoleAssignment[] = [];
  for (const assignment of assignments) {
    if (!assignment || typeof assignment !== 'object') continue;
    const role = typeof (assignment as { role?: unknown }).role === 'string'
      ? (assignment as { role: string }).role
      : undefined;
    const tenantId = typeof (assignment as { tenantId?: unknown }).tenantId === 'string'
      ? (assignment as { tenantId: string }).tenantId
      : undefined;
    if (!role || !tenantId) continue;
    const siteId = typeof (assignment as { siteId?: unknown }).siteId === 'string'
      ? (assignment as { siteId: string }).siteId
      : undefined;
    const permissions = normalizePermissionGrants(
      (assignment as RoleAssignment).permissions,
      tenantId,
      siteId,
    );
    normalized.push({
      role,
      tenantId,
      siteId,
      permissions: permissions.length ? permissions : undefined,
      expiresAt:
        typeof (assignment as { expiresAt?: unknown }).expiresAt === 'string'
          ? (assignment as { expiresAt: string }).expiresAt
          : undefined,
    });
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
  const roleAssignments = normalizeRoleAssignments((user as { roleAssignments?: unknown }).roleAssignments);
  return {
    ...(user as Record<string, unknown>),
    role: primaryRole,
    roles,
    permissions: permissions.length ? permissions : undefined,
    roleAssignments,
  } as AuthUser;
};

const persistAuthStorage = (user: AuthUser | null, token?: string) => {
  if (!user) {
    safeLocalStorage.removeItem(TOKEN_KEY);
    safeLocalStorage.removeItem(FALLBACK_TOKEN_KEY);
    safeLocalStorage.removeItem(TENANT_KEY);
    safeLocalStorage.removeItem(SITE_KEY);
    safeLocalStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  if (token) {
    safeLocalStorage.setItem(TOKEN_KEY, token);
    safeLocalStorage.setItem(FALLBACK_TOKEN_KEY, token);
  } else {
    safeLocalStorage.removeItem(TOKEN_KEY);
    safeLocalStorage.removeItem(FALLBACK_TOKEN_KEY);
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

      const storedToken =
        safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
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

