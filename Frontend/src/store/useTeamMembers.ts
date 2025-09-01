import { create } from 'zustand';
import api from '../utils/api';
import type { TeamMember } from '../types';

interface TeamMemberState {
  members: TeamMember[];
  fetchMembers: () => Promise<TeamMember[]>;
  addMember: (data: Partial<TeamMember> | FormData) => Promise<TeamMember>;
  updateMember: (id: string, data: Partial<TeamMember> | FormData) => Promise<TeamMember>;
  deleteMember: (id: string) => Promise<void>;
}

export const useTeamMembers = create<TeamMemberState>((set, get) => ({
  members: [],
  fetchMembers: async () => {
    const res = await api.get('/team');
    const members = (res.data as any[]).map((m) => ({
      id: m._id ?? m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department,
      employeeId: m.employeeId,
      managerId: m.managerId ?? m.reportsTo ?? null,
      avatar: m.avatar,
    })) as TeamMember[];
    set({ members });
    return members;
  },
  addMember: async (data) => {
    const isForm = data instanceof FormData;
    const res = await api.post('/team', data, {
      headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    const member = {
      id: res.data._id ?? res.data.id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      department: res.data.department,
      employeeId: res.data.employeeId,
      managerId: res.data.managerId ?? res.data.reportsTo ?? null,
      avatar: res.data.avatar,
    } as TeamMember;
    set((state) => ({ members: [...state.members, member] }));
    return member;
  },
  updateMember: async (id, data) => {
    const isForm = data instanceof FormData;
    const res = await api.put(`/team/${id}`, data, {
      headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    const member = {
      id: res.data._id ?? res.data.id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      department: res.data.department,
      employeeId: res.data.employeeId,
      managerId: res.data.managerId ?? res.data.reportsTo ?? null,
      avatar: res.data.avatar,
    } as TeamMember;
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? member : m)),
    }));
    return member;
  },
  deleteMember: async (id) => {
    await api.delete(`/team/${id}`);
    set((state) => ({ members: state.members.filter((m) => m.id !== id) }));
  },
}));
