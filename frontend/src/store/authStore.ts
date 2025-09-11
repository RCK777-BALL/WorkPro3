import { create } from 'zustand';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Keep authentication details in memory to avoid storing sensitive data.
  // Session management should rely on secure, server-managed cookies.
  user: null,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));

export const isAdmin = (state: AuthState) => state.user?.role === 'admin';
export const isManager = (state: AuthState) => state.user?.role === 'manager';
export const isTechnician = (state: AuthState) => state.user?.role === 'technician';
export const isViewer = (state: AuthState) => state.user?.role === 'viewer';
