import { create } from 'zustand';
import api from '../utils/api';
import type { TeamMember, TeamMemberResponse } from '../types';

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
    const res = await api.get<TeamMemberResponse[]>('/team');
    const members = res.data.map(mapMember);
    set({ members });
    return members;
  },
  addMember: async (data) => {
    const isForm = data instanceof FormData;
    const res = await api.post<TeamMemberResponse>('/team', data, {
      headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    const member = mapMember(res.data);
    set((state) => ({ members: [...state.members, member] }));
    return member;
  },
  updateMember: async (id, data) => {
    const isForm = data instanceof FormData;
    const res = await api.put<TeamMemberResponse>(`/team/${id}`, data, {
      headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    const member = mapMember(res.data);
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

function mapMember(data: TeamMemberResponse): TeamMember {
  return {
    id: data._id ?? data.id ?? '',
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department,
    employeeId: data.employeeId,
    managerId: data.managerId ?? data.reportsTo ?? null,
    avatar: data.avatar,
  };
}
