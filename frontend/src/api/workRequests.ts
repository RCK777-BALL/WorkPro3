/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type WorkRequestStatus = 'new' | 'reviewing' | 'converted' | 'closed';

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
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: WorkRequestStatus;
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

export const fetchWorkRequests = async () => {
  const response = await http.get<WorkRequestItem[]>('/work-requests');
  return response.data;
};

export const updateWorkRequestStatus = async (requestId: string, status: WorkRequestStatus) => {
  const response = await http.patch<WorkRequestItem>(`/work-requests/${requestId}/status`, { status });
  return response.data;
};

export const convertWorkRequest = async (requestId: string) => {
  const response = await http.post<ConvertWorkRequestResponse>(`/work-requests/${requestId}/convert`, {});
  return response.data;
};
