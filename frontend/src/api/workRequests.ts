/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type WorkRequestStatus = 'new' | 'reviewing' | 'converted' | 'closed' | 'rejected';

export interface WorkRequestAttachment {
  key: string;
  files: string[];
  paths: string[];
}

export interface WorkRequestItem {
  _id: string;
  token: string;
  title: string;
  description?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  location?: string;
  assetTag?: string;
  asset?: string;
  category?: string;
  tags?: string[];
  siteId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkRequestStatus;
  rejectionReason?: string;
  triagedAt?: string;
  triagedBy?: string;
  attachments?: WorkRequestAttachment[];
  photos?: string[];
  createdAt: string;
  workOrder?: string;
}

export interface WorkRequestSummary {
  total: number;
  open: number;
  statusCounts: Record<WorkRequestStatus, number>;
  recent: WorkRequestItem[];
}

export interface ConvertWorkRequestResponse {
  workOrderId: string;
  request: WorkRequestItem;
}

export const fetchWorkRequestSummary = async () => {
  const response = await http.get<WorkRequestSummary>('/work-requests/summary');
  return response.data;
};

export const fetchWorkRequests = async (filters?: {
  status?: WorkRequestStatus | 'all';
  priority?: WorkRequestItem['priority'] | 'all';
  asset?: string;
  location?: string;
  tag?: string;
  search?: string;
}) => {
  const params: Record<string, string> = {};
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.priority && filters.priority !== 'all') params.priority = filters.priority;
  if (filters?.asset) params.asset = filters.asset;
  if (filters?.location) params.location = filters.location;
  if (filters?.tag) params.tag = filters.tag;
  if (filters?.search) params.search = filters.search;
  const response = await http.get<WorkRequestItem[]>('/work-requests', { params });
  return response.data;
};

export const fetchWorkRequest = async (requestId: string) => {
  const response = await http.get<WorkRequestItem>(`/work-requests/${requestId}`);
  return response.data;
};

export const updateWorkRequestStatus = async (
  requestId: string,
  payload: { status: WorkRequestStatus; reason?: string; note?: string },
) => {
  const response = await http.patch<WorkRequestItem>(`/work-requests/${requestId}/status`, payload);
  return response.data;
};

export const convertWorkRequest = async (requestId: string) => {
  const response = await http.post<ConvertWorkRequestResponse>(`/work-requests/${requestId}/convert`, {});
  return response.data;
};
