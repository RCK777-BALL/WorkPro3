import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
      }),
      logout: () => set({
        user: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const isAdmin = (state: AuthState) => state.user?.role === 'admin';
export const isManager = (state: AuthState) => state.user?.role === 'manager';
export const isTechnician = (state: AuthState) => state.user?.role === 'technician';
export const isViewer = (state: AuthState) => state.user?.role === 'viewer';
