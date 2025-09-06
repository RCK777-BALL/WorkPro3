import api from '../lib/api';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DepartmentPayload = Pick<Department, 'name' | 'description'>;

export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/departments');
  return data;
}

export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  const { data } = await api.post<Department>('/departments', payload);
  return data;
}

export async function updateDepartment(
  id: string,
  payload: DepartmentPayload,
): Promise<Department> {
  const { data } = await api.put<Department>(`/departments/${id}`, payload);
  return data;
}
