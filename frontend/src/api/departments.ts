import api from "../lib/api";

export type Department = {
  _id: string;
  name: string;
  lines?: Array<{ _id: string; name: string }>;
  createdAt?: string;
};

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>("/departments");
  return data;
}
