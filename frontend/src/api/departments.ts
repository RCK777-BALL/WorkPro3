import http from '../lib/http';

export type Department = {
  _id: string;
  name: string;
  description?: string;
};

export async function listDepartments(): Promise<Department[]> {
  try {
    const { data } = await http.get<Department[]>('/departments');
    return data;
  } catch (e) {
    // Return empty list if API not ready yet (so UI still renders)
    return [];
  }
}
