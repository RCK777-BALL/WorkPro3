import api from '../lib/api';

export interface Station {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StationPayload = Pick<Station, 'name'>;

export interface Line {
  _id: string;
  name: string;
  stations: Station[];
  createdAt?: string;
  updatedAt?: string;
}

export type LinePayload = Pick<Line, 'name'>;

export interface Department {
  _id: string;
  name: string;
  description?: string;
  lines: Line[];
  createdAt?: string;
  updatedAt?: string;
}

export type DepartmentPayload = Pick<Department, 'name' | 'description'>;

// ---- Department helpers ----
export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/departments');
  return data;
}

export async function createDepartment(
  payload: DepartmentPayload,
): Promise<Department> {
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

export async function deleteDepartment(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/departments/${id}`);
  return data;
}

// ---- Line helpers ----
export async function listLines(departmentId: string): Promise<Line[]> {
  const { data } = await api.get<Line[]>(`/departments/${departmentId}/lines`);
  return data;
}

export async function createLine(
  departmentId: string,
  payload: LinePayload,
): Promise<Line> {
  const { data } = await api.post<Line>(
    `/departments/${departmentId}/lines`,
    payload,
  );
  return data;
}

export async function updateLine(
  departmentId: string,
  lineId: string,
  payload: LinePayload,
): Promise<Line> {
  const { data } = await api.put<Line>(
    `/departments/${departmentId}/lines/${lineId}`,
    payload,
  );
  return data;
}

export async function deleteLine(
  departmentId: string,
  lineId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/departments/${departmentId}/lines/${lineId}`,
  );
  return data;
}

// ---- Station helpers ----
export async function listStations(
  departmentId: string,
  lineId: string,
): Promise<Station[]> {
  const { data } = await api.get<Station[]>(
    `/departments/${departmentId}/lines/${lineId}/stations`,
  );
  return data;
}

export async function createStation(
  departmentId: string,
  lineId: string,
  payload: StationPayload,
): Promise<Station> {
  const { data } = await api.post<Station>(
    `/departments/${departmentId}/lines/${lineId}/stations`,
    payload,
  );
  return data;
}

export async function updateStation(
  departmentId: string,
  lineId: string,
  stationId: string,
  payload: StationPayload,
): Promise<Station> {
  const { data } = await api.put<Station>(
    `/departments/${departmentId}/lines/${lineId}/stations/${stationId}`,
    payload,
  );
  return data;
}

export async function deleteStation(
  departmentId: string,
  lineId: string,
  stationId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/departments/${departmentId}/lines/${lineId}/stations/${stationId}`,
  );
  return data;
}
