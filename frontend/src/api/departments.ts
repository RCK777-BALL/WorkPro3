/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Asset, DepartmentHierarchy, LineWithStations, StationWithAssets } from '@/types';

export type DepartmentPayload = {
  name: string;
  description?: string;
};

export type DepartmentImportSummary = {
  createdDepartments: number;
  createdLines: number;
  createdStations: number;
  createdAssets: number;
  warnings: string[];
};

type AssetResponse = {
  _id: string;
  name: string;
  type: Asset['type'];
  status?: string;
  description?: string;
  notes?: string;
  location?: string;
  lastServiced?: string;
  criticality?: string;
};

type StationResponse = {
  _id: string;
  name: string;
  description?: string;
  notes?: string;
  assets: AssetResponse[];
};

type LineResponse = {
  _id: string;
  name: string;
  description?: string;
  notes?: string;
  stations: StationResponse[];
};

export type DepartmentResponse = {
  _id: string;
  name: string;
  description?: string;
  notes?: string;
  lines?: LineResponse[];
};

const toAsset = (
  asset: AssetResponse,
  context: { departmentName: string; lineName: string; stationName: string },
): Asset => ({
  id: asset._id,
  name: asset.name,
  type: asset.type,
  status: asset.status ?? 'Active',
  description: asset.description,
  notes: asset.notes,
  location: asset.location,
  lastServiced: asset.lastServiced,
  department: context.departmentName,
  line: context.lineName,
  station: context.stationName,
});

const toStation = (
  station: StationResponse,
  context: { departmentId: string; departmentName: string; lineId: string; lineName: string },
): StationWithAssets => ({
  id: station._id,
  name: station.name,
  notes: station.description ?? station.notes,
  description: station.description ?? station.notes,
  line: context.lineId,
  assets: station.assets.map((asset) =>
    toAsset(asset, {
      departmentName: context.departmentName,
      lineName: context.lineName,
      stationName: station.name,
    }),
  ),
});

const toLine = (
  line: LineResponse,
  context: { departmentId: string; departmentName: string },
): LineWithStations => ({
  id: line._id,
  name: line.name,
  department: context.departmentId,
  notes: line.description ?? line.notes,
  description: line.description ?? line.notes,
  stations: line.stations.map((station) =>
    toStation(station, {
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      lineId: line._id,
      lineName: line.name,
    }),
  ),
});

const toDepartment = (department: DepartmentResponse): DepartmentHierarchy => ({
  id: department._id,
  name: department.name,
  notes: department.description ?? department.notes,
  description: department.description ?? department.notes,
  lines: (department.lines ?? []).map((line) =>
    toLine(line, { departmentId: department._id, departmentName: department.name }),
  ),
});

export const listDepartments = async (): Promise<DepartmentResponse[]> =>
  http.get<DepartmentResponse[]>('/departments').then((res) => res.data);

export const deleteDepartment = (id: string) => http.delete(`/departments/${id}`);

export const createDepartment = (payload: DepartmentPayload) =>
  http.post<DepartmentResponse>('/departments', payload).then((res) => res.data);

export const updateDepartment = (id: string, payload: DepartmentPayload) =>
  http.put<DepartmentResponse>(`/departments/${id}`, payload).then((res) => res.data);

export const listDepartmentHierarchy = async (): Promise<DepartmentHierarchy[]> => {
  const data = await http.get<DepartmentResponse[]>('/departments', {
    params: { include: 'lines,stations,assets' },
  });
  return data.data.map(toDepartment);
};

export const createLine = (deptId: string, payload: { name: string; notes?: string }) =>
  http
    .post<DepartmentResponse>(`/departments/${deptId}/lines`, payload)
    .then((res) => toDepartment(res.data));

export const updateLine = (
  deptId: string,
  lineId: string,
  payload: { name?: string; notes?: string },
) =>
  http
    .put<DepartmentResponse>(`/departments/${deptId}/lines/${lineId}`, payload)
    .then((res) => toDepartment(res.data));

export const deleteLine = (deptId: string, lineId: string) =>
  http
    .delete<DepartmentResponse>(`/departments/${deptId}/lines/${lineId}`)
    .then((res) => toDepartment(res.data));

export const createStation = (
  deptId: string,
  lineId: string,
  payload: { name: string; notes?: string },
) =>
  http
    .post<DepartmentResponse>(`/departments/${deptId}/lines/${lineId}/stations`, payload)
    .then((res) => toDepartment(res.data));

export const updateStation = (
  deptId: string,
  lineId: string,
  stationId: string,
  payload: { name?: string; notes?: string },
) =>
  http
    .put<DepartmentResponse>(
      `/departments/${deptId}/lines/${lineId}/stations/${stationId}`,
      payload,
    )
    .then((res) => toDepartment(res.data));

export const deleteStation = (deptId: string, lineId: string, stationId: string) =>
  http
    .delete<DepartmentResponse>(
      `/departments/${deptId}/lines/${lineId}/stations/${stationId}`,
    )
    .then((res) => toDepartment(res.data));

export const createAsset = (
  deptId: string,
  lineId: string,
  stationId: string,
  payload: {
    name: string;
    type: Asset['type'];
    status?: string;
    description?: string;
    notes?: string;
    location?: string;
    lastServiced?: string;
  },
) =>
  http
    .post<DepartmentResponse>(
      `/departments/${deptId}/lines/${lineId}/stations/${stationId}/assets`,
      payload,
    )
    .then((res) => toDepartment(res.data));

export const updateAsset = (
  deptId: string,
  lineId: string,
  stationId: string,
  assetId: string,
  payload: Partial<{
    name: string;
    type: Asset['type'];
    status: string;
    description: string;
    notes: string;
    location: string;
    lastServiced: string;
  }>,
) =>
  http
    .put<DepartmentResponse>(
      `/departments/${deptId}/lines/${lineId}/stations/${stationId}/assets/${assetId}`,
      payload,
    )
    .then((res) => toDepartment(res.data));

export const deleteAsset = (
  deptId: string,
  lineId: string,
  stationId: string,
  assetId: string,
) =>
  http
    .delete<DepartmentResponse>(
      `/departments/${deptId}/lines/${lineId}/stations/${stationId}/assets/${assetId}`,
    )
    .then((res) => toDepartment(res.data));

export const exportDepartmentsExcel = async (): Promise<Blob> => {
  const response = await http.get<ArrayBuffer>('/departments/export', {
    responseType: 'arraybuffer',
  });
  return new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

export const importDepartmentsExcel = async (file: File): Promise<DepartmentImportSummary> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await http.post<DepartmentImportSummary>('/departments/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const listLines = async (deptId: string): Promise<LineResponse[]> => {
  const department = await http.get<DepartmentResponse>(`/departments/${deptId}`, {
    params: { include: 'lines' },
  });
  return department.data.lines ?? [];
};

export const listStations = async (
  deptId: string,
  lineId: string,
): Promise<StationResponse[]> => {
  const department = await http.get<DepartmentResponse>(`/departments/${deptId}`, {
    params: { include: 'lines,stations' },
  });
  const line = (department.data.lines ?? []).find((item) => item._id === lineId);
  return line?.stations ?? [];
};

export const mapDepartmentResponse = toDepartment;

export type { LineResponse, StationResponse };
