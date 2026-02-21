import { api } from '@/lib/api';

export const TRADE_OPTIONS = ['Electrical', 'Mechanical', 'Tooling', 'Facilities', 'Automation', 'Other'] as const;

export type AdminUserRole = 'admin' | 'manager' | 'technician' | 'user' | string;

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  trade: (typeof TRADE_OPTIONS)[number] | string;
  employeeNumber: string;
  startDate: string | null;
  role: AdminUserRole;
  roles: string[];
  status: 'active' | 'invited' | 'disabled';
  active: boolean;
  mustChangePassword?: boolean;
};

export type CreateAdminUserInput = {
  fullName: string;
  email: string;
  trade: string;
  employeeNumber: string;
  startDate?: string;
  role: string;
  tempPassword: string;
};

export type PatchAdminUserInput = Partial<CreateAdminUserInput> & {
  status?: 'active' | 'invited' | 'disabled';
};

export const listAdminUsers = async () => {
  const { data } = await api.get<AdminUser[]>('/admin/users');
  return data;
};

export const createAdminUser = async (payload: CreateAdminUserInput) => {
  const { data } = await api.post<{ user: AdminUser; inviteSent?: boolean }>('/admin/users', payload);
  return data;
};

export const patchAdminUser = async (id: string, payload: PatchAdminUserInput) => {
  const { data } = await api.patch<{ user: AdminUser }>(`/admin/users/${id}`, payload);
  return data;
};

export const resetAdminUserPassword = async (id: string, payload: { tempPassword: string }) => {
  const { data } = await api.post<{ user: AdminUser }>(`/admin/users/${id}/reset-password`, payload);
  return data;
};

export const deleteAdminUser = async (id: string) => {
  const { data } = await api.delete<{ ok: boolean }>(`/admin/users/${id}`);
  return data;
};
