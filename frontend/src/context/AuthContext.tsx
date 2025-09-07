// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../types';
import http from '../lib/http';

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

  const setStoreUser = useAuthStore((state) => state.setUser);
  const storeLogout = useAuthStore((state) => state.logout);

  const mirrored = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    const parsed: AuthUser | null = saved ? JSON.parse(saved) : null;
    setUser(parsed);
    if (!mirrored.current) {
      setStoreUser(parsed);
      mirrored.current = true;
    }
    setLoading(false);
  }, [setStoreUser]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user, loading]);

  const handleSetUser = useCallback(
    (u: AuthUser | null) => {
      setUser(u);
      setStoreUser(u);
    },
    [setStoreUser]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await http.post('/auth/login', { email, password });
 
      handleSetUser({ ...data.user, token: data.token });
 
    },
    [handleSetUser]
  );

  const logout = useCallback(() => {
    handleSetUser(null);
    localStorage.removeItem('token');
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

