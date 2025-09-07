import http from '../lib/http';

export type Department = {
  _id: string;
  name: string;
  description?: string;
  lines?: Array<{ _id: string; name: string }>;
};

export type DepartmentPayload = { name: string; description?: string };

export async function listDepartments(): Promise<Department[]> {
  const { data } = await http.get<Department[]>('/departments');
  return data;
}

export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  const { data } = await http.post<Department>('/departments', payload);
  return data;
}

export async function updateDepartment(id: string, payload: DepartmentPayload): Promise<Department> {
  const { data } = await http.put<Department>(`/departments/${id}`, payload);
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await http.delete(`/departments/${id}`);
}

export type Line = { _id: string; name: string };

export async function listLines({
  departmentId,
}: {
  departmentId: string;
}): Promise<Line[]> {
  const { data } = await http.get<Line[]>(
    `/departments/${departmentId}/lines`,
  );
  return data;
}

export type Station = { _id: string; name: string };

export async function listStations(
  departmentId: string,
  lineId: string,
): Promise<Station[]> {
  const { data } = await http.get<Station[]>(
    `/departments/${departmentId}/lines/${lineId}/stations`,
  );
  return data;
}

