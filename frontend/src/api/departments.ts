import api from "../lib/api";

export interface Department {
  _id: string;
  name: string;
  lines?: Array<{ _id: string; name: string }>;
  createdAt?: string;
}

export type DepartmentPayload = {
  name?: string;
  lines?: Array<{ _id?: string; name: string }>;
};

export const listDepartments = () =>
  api.get<Department[]>("/departments").then((res) => res.data);

export const createDepartment = (payload: DepartmentPayload) =>
  api.post<Department>("/departments", payload).then((res) => res.data);

export const updateDepartment = (id: string, payload: DepartmentPayload) =>
  api.put<Department>(`/departments/${id}`, payload).then((res) => res.data);

export const deleteDepartment = (id: string) =>
  api.delete<void>(`/departments/${id}`).then((res) => res.data);
