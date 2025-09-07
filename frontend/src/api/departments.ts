import http from '../lib/http';

export type Station = {
  _id: string;
  name: string;
};

export type Line = {
  _id: string;
  name: string;
  stations?: Station[];
  departmentId?: string;
  departmentName?: string;
};

export type Department = {
  _id: string;
  name: string;
  description?: string;
  lines?: Line[];
};

export type DepartmentPayload = { name: string; description?: string };

export async function listDepartments(): Promise<Department[]> {
  const { data } = await http.get<Department[]>('/departments');
  return data;
}

export async function listLines(opts?: { departmentId?: string }): Promise<Line[]> {
  const { departmentId } = opts ?? {};

  try {
    if (departmentId) {
      try {
        const { data } = await http.get<Line[]>(`/departments/${departmentId}/lines`);
        return data;
      } catch {
        // fall through to try generic endpoint
      }
    }

    const { data } = await http.get<Line[]>('/lines', {
      params: departmentId ? { departmentId } : undefined,
    });

    return data;
  } catch {
    const departments = await listDepartments();
    const lines = departments.flatMap((dept) =>
      (dept.lines ?? []).map((line) => ({
        ...line,
        departmentId: dept._id,
        departmentName: dept.name,
      })),
    );

    return departmentId ? lines.filter((l) => l.departmentId === departmentId) : lines;
  }
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

