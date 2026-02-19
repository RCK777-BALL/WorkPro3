/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export const TRADE_OPTIONS = [
  'Electrical',
  'Mechanical',
  'Tooling',
  'Facilities',
  'Automation',
  'Other',
] as const;

export type TradeOption = (typeof TRADE_OPTIONS)[number];
export type AdminUserStatus = 'active' | 'invited' | 'disabled';
export type AdminCreateMode = 'temp_password' | 'invite';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  trade: TradeOption;
  employeeNumber: string;
  startDate: string | null;
  role: string;
  roles: string[];
  mustChangePassword: boolean;
  status: AdminUserStatus;
  invitedAt: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAdminUserPayloadBase {
  fullName: string;
  email: string;
  trade: TradeOption;
  employeeNumber: string;
  startDate: string;
  role?: string;
}

export type CreateAdminUserPayload =
  | (CreateAdminUserPayloadBase & { mode: 'temp_password'; tempPassword: string })
  | (CreateAdminUserPayloadBase & { mode: 'invite' });

export interface ListAdminUsersQuery {
  search?: string;
  trade?: string;
  role?: string;
  status?: AdminUserStatus | '';
}

export interface PatchAdminUserPayload {
  fullName?: string;
  email?: string;
  trade?: TradeOption;
  employeeNumber?: string;
  startDate?: string;
  role?: string;
  status?: AdminUserStatus;
}

export const listAdminUsers = async (query: ListAdminUsersQuery = {}): Promise<AdminUser[]> => {
  const response = await http.get<AdminUser[]>('/admin/users', { params: query });
  return response.data ?? [];
};

export const createAdminUser = async (
  payload: CreateAdminUserPayload,
): Promise<{ user: AdminUser; inviteSent: boolean }> => {
  const response = await http.post<{ user: AdminUser; inviteSent: boolean }>('/admin/users', payload);
  return response.data;
};

export const patchAdminUser = async (
  id: string,
  payload: PatchAdminUserPayload,
): Promise<{ user: AdminUser }> => {
  const response = await http.patch<{ user: AdminUser }>(`/admin/users/${id}`, payload);
  return response.data;
};
