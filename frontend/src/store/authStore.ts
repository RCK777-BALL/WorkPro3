/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import type { AuthUser } from '@/types';

export interface AuthState {
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
  setUser: (user: AuthUser | null) =>
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
export const isSupervisor = (state: AuthState) => state.user?.role === 'supervisor';
export const isPlanner = (state: AuthState) => state.user?.role === 'planner';
export const isTech = (state: AuthState) => state.user?.role === 'tech';
