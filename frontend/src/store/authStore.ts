/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import type { AuthRole, AuthUser } from '@/types';

export interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const hasRole = (user: AuthUser | null | undefined, role: AuthRole): boolean => {
  if (!user) return false;
  const target = role.toLowerCase();
  if (user.role?.toLowerCase() === target) return true;
  return user.roles?.some((r) => r.toLowerCase() === target) ?? false;
};

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

export const hasAuthRole = (user: AuthUser | null | undefined, role: AuthRole | string) => {
  if (!user) return false;
  const target = role.toLowerCase();
  if (user.role?.toLowerCase() === target) return true;
  return user.roles?.some((r) => r.toLowerCase() === target) ?? false;
};

export const isAdmin = (state: AuthState) =>
  hasRole(state.user, 'general_manager') || hasRole(state.user, 'admin');
export const isSupervisor = (state: AuthState) =>
  hasRole(state.user, 'assistant_general_manager') || hasRole(state.user, 'supervisor');
export const isManager = (state: AuthState) =>
  hasRole(state.user, 'operations_manager') || hasRole(state.user, 'manager');
export const isPlanner = (state: AuthState) => hasRole(state.user, 'planner');
export const isTech = (state: AuthState) => hasRole(state.user, 'tech');
