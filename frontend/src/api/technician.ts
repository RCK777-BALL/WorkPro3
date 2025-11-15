/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { WorkOrder } from '@/types';
import type { UploadResponse } from '@shared/uploads';

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export interface TechnicianWorkOrderDto {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  priority?: WorkOrder['priority'];
  status?: WorkOrder['status'];
  type?: WorkOrder['type'];
  asset?: { id?: string; name?: string };
  department?: string;
  timeSpentMin?: number;
  dueDate?: string;
  updatedAt?: string;
  partsUsed?: { partId: string; qty: number; cost?: number }[];
  photos?: string[];
}

export const normalizeTechnicianWorkOrder = (dto: TechnicianWorkOrderDto): WorkOrder => ({
  id: dto.id ?? dto._id ?? randomId(),
  title: dto.title ?? 'Untitled Work Order',
  description: dto.description,
  priority: dto.priority ?? 'medium',
  status: dto.status ?? 'requested',
  type: dto.type ?? 'corrective',
  department: dto.department ?? 'General',
  timeSpentMin: dto.timeSpentMin,
  dueDate: dto.dueDate,
  updatedAt: dto.updatedAt,
  partsUsed: dto.partsUsed,
  photos: dto.photos,
  asset: dto.asset?.id || dto.asset?.name
    ? { id: dto.asset?.id ?? '', name: dto.asset?.name ?? 'Asset' }
    : undefined,
});

export interface TechnicianStatePayload {
  action: 'start' | 'pause' | 'resume' | 'complete' | 'log_time';
  minutesWorked?: number;
}

export interface TechnicianPartUsagePayload {
  entries: { partId: string; qty: number; cost?: number }[];
}

export interface TechnicianUploadResponse extends UploadResponse {
  workOrder: TechnicianWorkOrderDto;
}

export const fetchTechnicianWorkOrders = async (): Promise<TechnicianWorkOrderDto[]> => {
  const res = await http.get<TechnicianWorkOrderDto[]>('/technician/work-orders');
  return res.data;
};

export const updateTechnicianWorkOrderState = async (
  workOrderId: string,
  payload: TechnicianStatePayload,
): Promise<TechnicianWorkOrderDto> => {
  const res = await http.post<TechnicianWorkOrderDto>(
    `/technician/work-orders/${workOrderId}/state`,
    payload,
  );
  return res.data;
};

export const logTechnicianPartUsage = async (
  workOrderId: string,
  payload: TechnicianPartUsagePayload,
): Promise<TechnicianWorkOrderDto> => {
  const res = await http.post<TechnicianWorkOrderDto>(
    `/technician/work-orders/${workOrderId}/parts`,
    payload,
  );
  return res.data;
};

export const uploadTechnicianPhotos = async (
  workOrderId: string,
  files: File[],
): Promise<TechnicianUploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const res = await http.post<TechnicianUploadResponse>(
    `/technician/work-orders/${workOrderId}/attachments`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data;
};
