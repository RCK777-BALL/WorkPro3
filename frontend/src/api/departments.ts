import api from '../lib/api';

export type Line = { _id: string; name: string; updatedAt?: string };
export type Department = {
  _id: string;
  name: string;
  description?: string;
  lines?: Line[];
  updatedAt?: string;
  createdAt?: string;
};
export type DepartmentPayload = Pick<Department, 'name' | 'description'>;

export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get('/api/departments');
  return data;
}
export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  const { data } = await api.post('/api/departments', payload);
  return data;
}
export async function updateDepartment(id: string, payload: DepartmentPayload): Promise<Department> {
  const { data } = await api.put(`/api/departments/${id}`, payload);
  return data;
}
export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/api/departments/${id}`);
}

// Optional Lines API (guard usage, backend may or may not exist)
export async function listLines(deptId: string): Promise<Line[]> {
  const { data } = await api.get(`/api/departments/${deptId}/lines`);
  return data;
}
export async function createLine(deptId: string, name: string): Promise<Line> {
  const { data } = await api.post(`/api/departments/${deptId}/lines`, { name });
  return data;
}
export async function updateLine(deptId: string, lineId: string, name: string): Promise<Line> {
  const { data } = await api.put(`/api/departments/${deptId}/lines/${lineId}`, { name });
  return data;
}
export async function deleteLine(deptId: string, lineId: string): Promise<void> {
  await api.delete(`/api/departments/${deptId}/lines/${lineId}`);
}
