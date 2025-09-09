import http from '../lib/http';

export type Department = {
  _id: string;
  name: string;
  description?: string;
};

export async function listDepartments(): Promise<Department[]> {
  const { data } = await http.get<Department[]>('/departments');
  return data;
}

export const deleteDepartment = (id: string) =>
   http.delete(`/departments/${id}`);
 
