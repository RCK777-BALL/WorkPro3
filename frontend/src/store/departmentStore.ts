import { create } from 'zustand';
import type { Department, Line, Station } from '../types';
import api from '../lib/api';

interface DepartmentState {
  departments: Department[];
  linesByDepartment: Record<string, Line[]>;
  stationsByLine: Record<string, Station[]>;
  setDepartments: (departments: Department[]) => void;
  setLines: (departmentId: string, lines: Line[]) => void;
  setStations: (lineId: string, stations: Station[]) => void;
  addDepartment: (department: Department) => void;
  updateDepartment: (department: Department) => void;
  removeDepartment: (id: string) => void;
  fetchDepartments: () => Promise<Department[]>;
  fetchLines: (departmentId: string) => Promise<Line[]>;
  fetchStations: (lineId: string) => Promise<Station[]>;
  refreshCache: () => Promise<void>;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  linesByDepartment: {},
  stationsByLine: {},
  setDepartments: (departments) => set({ departments }),
  setLines: (departmentId, lines) =>
    set((state) => ({
      linesByDepartment: { ...state.linesByDepartment, [departmentId]: lines },
    })),
  setStations: (lineId, stations) =>
    set((state) => ({
      stationsByLine: { ...state.stationsByLine, [lineId]: stations },
    })),
  addDepartment: (department) =>
    set((state) => ({ departments: [...state.departments, department] })),
  updateDepartment: (department) =>
    set((state) => ({
      departments: state.departments.map((d) =>
        d.id === department.id ? department : d
      ),
    })),
  removeDepartment: (id) =>
    set((state) => ({ departments: state.departments.filter((d) => d.id !== id) })),
  fetchDepartments: async () => {
    const { departments } = get();
    if (departments.length > 0) return departments;
    const res = await api.get('/departments');
    const data = (res.data as any[]).map((d) => ({
      id: d._id ?? d.id,
      name: d.name,
    })) as Department[];
    set({ departments: data });
    return data;
  },
  fetchLines: async (departmentId) => {
    const { linesByDepartment } = get();
    if (linesByDepartment[departmentId]) return linesByDepartment[departmentId];
    const res = await api.get(`/lines/department/${departmentId}`);
    const lines = (res.data as any[]).map((l) => ({
      id: l._id ?? l.id,
      name: l.name,
      department: departmentId,
    })) as Line[];
    set((state) => ({
      linesByDepartment: { ...state.linesByDepartment, [departmentId]: lines },
    }));
    return lines;
  },
  fetchStations: async (lineId) => {
    const { stationsByLine } = get();
    if (stationsByLine[lineId]) return stationsByLine[lineId];
    const res = await api.get(`/stations/line/${lineId}`);
    const stations = (res.data as any[]).map((s) => ({
      id: s._id ?? s.id,
      name: s.name,
      line: lineId,
    })) as Station[];
    set((state) => ({
      stationsByLine: { ...state.stationsByLine, [lineId]: stations },
    }));
    return stations;
  },
  refreshCache: async () => {
    const res = await api.get('/departments');
    const data = (res.data as any[]).map((d) => ({
      id: d._id ?? d.id,
      name: d.name,
    })) as Department[];
    set({ departments: data, linesByDepartment: {}, stationsByLine: {} });
  },
}));
