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
import type { AuthUser } from '@/types';
import http from '@/lib/http';

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
        const { data } = await http.get('/auth/me');
        handleSetUser(data);
      } catch {
        handleSetUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [handleSetUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await http.post('/auth/login', { email, password });
      handleSetUser(data.user);
    },
    [handleSetUser]
  );

  const logout = useCallback(async () => {
    await http.post('/auth/logout');
    handleSetUser(null);
    localStorage.removeItem('auth:tenantId');
    localStorage.removeItem('auth:siteId');
    storeLogout();
  }, [handleSetUser, storeLogout]);

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

