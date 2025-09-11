 import http from '@/lib/http';
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

export const createDepartment = (payload: Omit<Department, '_id'>) =>
  http.post<Department>('/departments', payload).then((res) => res.data);
 
